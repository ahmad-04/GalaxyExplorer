import { Devvit } from "@devvit/public-api";

const MessageScreen = ({message}) => {
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
        <vstack alignment={"middle center"} >
          <hstack height={"50%"} width={"50%"} alignment={"middle center"}>
            <text size={"xxlarge"} grow>{message}</text>
          </hstack>
        </vstack>
      </zstack>
    </blocks>
  )
}

export default MessageScreen