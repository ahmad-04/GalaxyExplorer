import { Devvit } from '@devvit/public-api';

const HomeScreen = ({ onCreateContest }) => {
  return (
    <blocks>
      <zstack height={'100%'} width={'100%'} alignment={'middle center'} backgroundColor={'#000'}>
        <hstack height={'100%'} width={'100%'}>
          <image
            height="100%"
            width="100%"
            url="drawwitbackground.png"
            imageWidth={1920}
            imageHeight={1080}
            resizeMode="cover"
          />
        </hstack>
        <zstack height="300px" width="300px">
          <vstack height="100%" width="100%">
            <hstack height="37%" width="100%" alignment="center middle">
              <hstack width="80%" height="100%" alignment="center middle">
                <image
                  height="100%"
                  width="100%"
                  url="drawwitlogo.png"
                  imageWidth={469}
                  imageHeight={165}
                  resizeMode="fit"
                />
              </hstack>
            </hstack>
            <vstack height="38%" width="100%" alignment="center middle">
              <hstack height="50%" width="80%" alignment="center middle">
                <hstack
                  height="100%"
                  width="80%"
                  alignment="middle center"
                  onPress={onCreateContest}
                >
                  <image
                    height="160%"
                    width="100%"
                    url="createcontest.png"
                    imageWidth={381}
                    imageHeight={130}
                    resizeMode="fit"
                  />
                </hstack>
              </hstack>
              <hstack height="50%" width="80%" alignment="center middle">
                <hstack width="80%" height="100%" alignment="center middle">
                  <image
                    height="150%"
                    width="140%"
                    url="leaderboardbutton.png"
                    imageWidth={375}
                    imageHeight={156}
                    resizeMode="fit"
                  />
                </hstack>
              </hstack>
            </vstack>
            <zstack height="25%" width="100%" alignment="center middle">
              <image
                height="100%"
                width="100%"
                url="lowerbottons.png"
                imageWidth={692}
                imageHeight={167}
                resizeMode="fit"
              />
              <hstack height="100%" width="100%">
                <hstack height="100%" width="50%"></hstack>
                <hstack height="100%" width="50%"></hstack>
              </hstack>
            </zstack>
          </vstack>
        </zstack>
      </zstack>
    </blocks>
  );
};

export default HomeScreen;
