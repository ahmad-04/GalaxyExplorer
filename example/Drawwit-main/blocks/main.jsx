// Learn more at developers.reddit.com/docs
import { Devvit, useState, useWebView, useAsync, useForm } from '@devvit/public-api';
import HomeScreen from './homeScreen';
import DrawwitContestScreen from './drawwitContestScreen.jsx';
import MessageScreen from './homeScreen';
import { checkUserAlreadyRated } from './redisUtil.js';
import GuessitScreen from './guessitScreen.jsx';

Devvit.configure({
  redditAPI: true,
});


const createPost = async (context) => {
  const { reddit } = context;
  const subreddit = await reddit.getCurrentSubreddit();
  const post = await reddit.submitPost({
    title: 'Welcome to drawwit',
    subredditName: subreddit.name,
    // The preview appears while the post loads
    preview: <blocks>
      <zstack height={"100%"} width={"100%"} alignment={"middle center"} backgroundColor={"#000"}>
        <hstack height={"100%"} width={"100%"}>
          <image
            height="100%"
            width="100%"
            url="drawwitbackground.png"
            imageWidth={1920}
            imageHeight={1080}
            resizeMode="cover"
          />
        </hstack>
        <text size={"xxlarge"}>Loading ...</text>
      </zstack>
    </blocks>
    ,
  });

  return post;
};

// Add a menu item to the subreddit menu for instantiating the new experience post
Devvit.addMenuItem({
  label: 'Add my post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { ui } = context;
    ui.showToast(
      "Submitting your post - upon completion you'll navigate there."
    );
    const post = await createPost(context);
    ui.navigateTo(post);
  },
});

Devvit.addTrigger({
  events: ['AppInstall'],
  onEvent: async (event, context) => {
    await createPost(context);
  },
});

// Add a post type definition
Devvit.addCustomPostType({
  name: 'Experience Post',
  height: 'tall',
  render: (_context) => {
    const [counter, setCounter] = useState(0);
    const [text, setText] = useState('');
    const { mount : mountClient } = useWebView({
      url: 'index.html',
      onMessage: (message, hook) => {},
    });
    const { mount : mountDrawwitDrawing } = useWebView({
      url: 'drawwitdrawing.html',
      onMessage: (message, hook) => {},
    });
    const selfPostId = _context.postId;
///// redis fetching/////////////////////////////---------------------------------
    const {
      data: userAlreadyRated,
      loading: userAlreadyRatedLoading,
      error: userAlreadyRatedError,
    } = useAsync(async () => {
      const entryIndex = await _context.redis.get(`${selfPostId}-entry`);
      const username = await _context.reddit.getCurrentUsername();

      let gradeAmount = await _context.redis.get(`${selfPostId}-entry${entryIndex}-grades`);
      gradeAmount = Number(gradeAmount) - 1;
      let userAlreadyRated = false;

      for (let i = 0; i <= gradeAmount; i++) {
        const currentAuthor = await _context.redis.get(
          `${selfPostId}-entry${entryIndex}-grade${i}-author`
        );
        if (currentAuthor === username) {
          userAlreadyRated = true;
          break;
        }
      }

      return userAlreadyRated ?? null;
    });

    const {
      data: screen,
      loading,
      error,
    } = useAsync(async () => {
      const value = await _context.redis.get(`${selfPostId}-screen`);
      return value ?? null
    });

    const {
      data: entriesAmount,
      loading: entriesLoading,
      error: entriesError,
    } = useAsync(async () => {
      const value = await _context.redis.get(`${selfPostId}-entries`);
      return value ?? null
    });

    const {
      data: entry,
      loading: entryLoading,
      error: entryError,
    } = useAsync(async () => {
      const value = await _context.redis.get(`${selfPostId}-entry`);
      return value ?? null
    });
    const {
      data: entryGradesAmount,
      loading: entryGradesAmountLoading,
      error: entryGradesAmountError,
    } = useAsync(async () => {

      const entryNumber = await _context.redis.get(`${selfPostId}-entry`);
      const value = await _context.redis.get(`${selfPostId}-entry${entryNumber}-grades`);
      return value ?? null
    });

    const {
      data: currentGrade,
      loading: currentGradeLoading,
      error: currentGradeError,
    } = useAsync(async () => {

      const entryNumber = await _context.redis.get(`${selfPostId}-entry`);
      const value = await _context.redis.get(`${selfPostId}-entry${entryNumber}-currentGrade`);
      return value ?? null
    });
/////////////////////////////////////////////////---------------------------------

    const rateForm = useForm(
      {
        title: 'Rate this drawing',
        fields: [
          {
            type: 'select',
            name: 'rating',
            label: 'How many stars?',
            options: [
              { label: '★☆☆☆☆ (1)', value: '1' },
              { label: '★★☆☆☆ (2)', value: '2' },
              { label: '★★★☆☆ (3)', value: '3' },
              { label: '★★★★☆ (4)', value: '4' },
              { label: '★★★★★ (5)', value: '5' },
            ],
            required: true,
          },
        ],
        acceptLabel: 'Submit',
        cancelLabel: 'Cancel',
      },
      async (values) => {
        if(userAlreadyRated){
          _context.ui.showToast("You have already rated this drawing");
          return;
        }

        const entryIndex = await _context.redis.get(`${selfPostId}-entry`);
        const username = await _context.reddit.getCurrentUsername()
        _context.ui.showToast(`Thanks! You rated ${values.rating}★`);
        let gradesAmount;

        const post = await _context.reddit.getPostById(selfPostId);
        const existsCurrentGrade = await _context.redis.exists(`${selfPostId}-entry${entryIndex}-currentGrade`);

        if (existsCurrentGrade === 1) {
          gradesAmount = await _context.redis.get(`${selfPostId}-entry${entryIndex}-grades`);
          const currentGrade = await _context.redis.get(`${selfPostId}-entry${entryIndex}-currentGrade`)
          await _context.redis.set(`${selfPostId}-entry${entryIndex}-currentGrade`,String((Number(values.rating)+Number(currentGrade))/(Number(gradesAmount)+1)));
          await _context.redis.set(`${selfPostId}-entry${entryIndex}-grades`,String(Number(gradesAmount)+1));

          await _context.redis.set(`${selfPostId}-entry${entryIndex}-grade${Number(gradesAmount)-1}`,String((Number(values.rating)+Number(currentGrade))/(Number(gradesAmount)+1)));
          await _context.redis.set(`${selfPostId}-entry${entryIndex}-grade${Number(gradesAmount)-1}-author`,username);
        }else{
          gradesAmount = 1
          await _context.redis.set(`${selfPostId}-entry${entryIndex}-grades`,"1");
          await _context.redis.set(`${selfPostId}-entry${entryIndex}-currentGrade`,String(Number(values.rating)));
          await _context.redis.set(`${selfPostId}-entry${entryIndex}-grade${Number(gradesAmount)-1}`,String(Number(values.rating)));
          await _context.redis.set(`${selfPostId}-entry${entryIndex}-grade${Number(gradesAmount)-1}-author`,username);
        }

        await _context.ui.navigateTo(post.url);
      }
    );

    const guessForm = useForm(
      {
        title: "What's going on in this drawing?",
        fields: [
          {
            type: 'string',
            name: 'guess',
            label: 'Your guess',
            required: true,
          },
        ],
        acceptLabel: 'Submit',
        cancelLabel: 'Cancel',
      },
      async (values) => {

        const username = await _context.reddit.getCurrentUsername()

        let guessAmount;
        guessAmount = await _context.redis.get(`${selfPostId}-guesses`);
        await _context.redis.set(`${selfPostId}-guesses`,String(Number(guessAmount)+1));
        guessAmount = String(Number(guessAmount)+1);
        await _context.redis.set(`${selfPostId}-guess${String(guessAmount)}`,values.guess);
        await _context.redis.set(`${selfPostId}-guess${String(guessAmount)}-author`,username);
        _context.ui.showToast(`You guessed: ${values.guess}`);
      }
    );

    if (error) {
      return (
        <blocks>
          <zstack height={"100%"} width={"100%"} alignment={"middle center"} backgroundColor={"#000"}>
            <hstack height={"100%"} width={"100%"}>
              <image
                height="100%"
                width="100%"
                url="drawwitbackground.png"
                imageWidth={1920}
                imageHeight={1080}
                resizeMode="cover"
              />
            </hstack>
            <text size={"xxlarge"}>Something went wrong</text>
          </zstack>
        </blocks>
      )
    } else if (loading) {
      return(
        <blocks>
          <zstack height={"100%"} width={"100%"} alignment={"middle center"} backgroundColor={"#000"}>
            <hstack height={"100%"} width={"100%"}>
              <image
                height="100%"
                width="100%"
                url="drawwitbackground.png"
                imageWidth={1920}
                imageHeight={1080}
                resizeMode="cover"
              />
            </hstack>
            <text size={"xxlarge"}>Loading ...</text>
          </zstack>
        </blocks>
      )
    } else if (screen !== "drawwit" && screen !== "guessit") {
      return <HomeScreen onCreateContest={mountClient} />;
    } else if (screen === "drawwit") {
      return (
        <DrawwitContestScreen
          onRate={async () => {
            _context.ui.showForm(rateForm);
          }}
          userAlreadyRated={userAlreadyRated}
          onReject={()=>{
            _context.ui.showToast("You have already rated this drawing");
          }}
          onMountDrawwitDrawing={mountDrawwitDrawing}
        />
      );
    } else if (screen === "guessit") {
      return (
        <GuessitScreen
          onGuess={()=>{
            _context.ui.showForm(guessForm);
          }}
        />
      )
    } else {
      return (
        <blocks>
          <zstack height={"100%"} width={"100%"} alignment={"middle center"} backgroundColor={"#000"}>
            <hstack height={"100%"} width={"100%"}>
              <image
                height="100%"
                width="100%"
                url="drawwitbackground.png"
                imageWidth={1920}
                imageHeight={1080}
                resizeMode="cover"
              />
            </hstack>
            <text size={"xxlarge"}>{`Internal error, contact u/Ibaniez. Screen:${screen}`}</text>
          </zstack>
        </blocks>
      );
    }
  },
});

export default Devvit;
