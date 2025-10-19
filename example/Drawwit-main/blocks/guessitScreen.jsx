import { Devvit } from '@devvit/public-api';
import { checkUserAlreadyRated } from './redisUtil.js';



function GuessitScreen({onGuess}) {

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
        <zstack height="510px" width="330px" alignment={'middle center'}>
          <vstack height={'100%'} width={'100%'} alignment={'center'}>
            <webview url={"guessitInline.html"} width={"100%"} height={"70%"} />
            <zstack height={'30%'} width={'100%'}>
              <hstack height={'100%'} width={'100%'} alignment={'middle center'}>
                <image
                  url={"guessitinlinebuttons.png"}
                  height={'100%'}
                  width={'100%'}
                />
              </hstack>
              <vstack height={'100%'} width={'100%'} alignment={'middle center'}>
                <hstack height={'50%'} width={'100%'} onPress={onGuess}></hstack>
                <hstack height={'50%'} width={'100%'} ></hstack>
              </vstack>
            </zstack>
          </vstack>
        </zstack>
      </zstack>
    </blocks>
  );
}

export default GuessitScreen;
