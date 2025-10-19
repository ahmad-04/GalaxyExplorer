import styled from 'styled-components';
import { motion } from 'framer-motion';

export const MainContainer = styled(motion.div)`
  width: 100%;
  height: 80%;
  background-color: white;
  border-radius: 30px;
  border: 4px solid black;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-top: 17%;
  box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.2);

`
export const TitleContainer = styled.div`
  width: 100%;
  height: 19%;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  font-size: 70px;
`
export const Snippet = styled.div`
  width: 100%;
  height: 27%;
  display: flex;
  flex-direction: column;
`
export const HeaderContainer = styled.div`
  width: 100%;
  height: 17%;
  display: flex;
  justify-content: center;
  align-items: center;
`

export const SnippetClassHolder = styled.div`
  width: 20%;
  height: 100%;
  font-size: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: #5c5c5c;
`

export const SnippetHeaderline = styled.div`
  width: 80%;
  height: 5%;
  background-color: #5c5c5c;
`

export const SelectorContainer = styled.div`
  width: 100%;
  height: 83%;
  display: flex;
  justify-content: center;
  align-items: center;
`
export const SelectorFont = styled(motion.div)`
  width: 85%;
  height: 70%;
  border: 3px solid black;
  border-radius: 30px;
  box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  font-size: 60px;
  background-color: white;
  user-select: none;
  text-shadow: 4px 4px 4px rgba(0, 0, 0, 0.2);

`

export const StyleContainer = styled.div`
  width: 50%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`
export const Container = styled.div`
  width: 60%;
  height: 80%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`
export const StyleLabel = styled.div`
  height: 25%;
  display: flex;
  justify-content: center;
  font-size: 35px;
  color: #5c5c5c;
  text-shadow: 4px 4px 4px rgba(0, 0, 0, 0.2);

`
export const SmallSelector = styled(motion.div)`
  margin-top: 10%;
  width: 100%;
  height: 50%;
  background-color: white;
  border-radius: 25px;
  border: 3px solid black;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 40px;
  box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.2);
  text-shadow: 4px 4px 4px rgba(0, 0, 0, 0.2);
  user-select: none;
`
export const ColorContainer = styled.div`
  width: 30%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`
export const Color = styled.div`
  width: 60%;
  height: 75%;
  border-radius: 50%;
  border: 2px solid black;
  background-color: blueviolet;
`

export const ColorLabel = styled.div`
  width: 70%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  font-size: 30px;
  text-shadow: 4px 4px 4px rgba(0, 0, 0, 0.2);
  user-select: none;
`

export const Backdrop = styled(motion.div)`
  width: 150%;
  height: 100%;
  background-color: rgba(92, 92, 92, 0.73);
  position: absolute;
  transform: translate(-50%,-50%);
  top: 50%;
  left: 50%;
  z-index: 110;
  display: flex;
  justify-content: center;
  align-items: center;
`

export const FontOptions = styled(motion.div)`
  width: 30%;
  height: 75%;
  background-color: white;
  border-radius: 30px;
  border: 4px solid black;
  z-index: 120;
  box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`

export const CloseIcon = styled(motion.div)`
  width: 7%;
  height: 7%;
  border-radius: 50px;
  background-color: #af25ff;
  border: 3px solid black;
  transform: translate(-50%, -50%);
  position: absolute;
  right: -2%;
  top: 17%;
  z-index: 200;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 35px ;
  user-select: none;
`
export const FontSelectorHeader = styled.div`
  width: 100%;
  height: 10%;
  display: flex;
  justify-content: center;
  align-items: center;
`
export const FontTitle = styled.div`
  width: 80%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  font-size: 50px;
  text-shadow: 4px 4px 4px rgba(0, 0, 0, 0.2);
`

export const CloseFontDisplayContainer = styled.div`
  width: 20%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`

export const CloseFontDisplay = styled(motion.div)`
  width: 90%;
  height: 90%;
  border-radius: 50px;
  background-color: #af25ff;
  border: 3px solid black;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 35px ;
`

export const FontListContainer = styled.div`
  width: 100%;
  height: 90%;
  display: flex;
  justify-content: center;
  align-items: center;
`

export const FontList = styled.div`
  width: 85%;
  height: 85%;
  border-radius: 30px;
  border: 3px solid black;
  background-color: #e2e2e2;
  box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
`

const Tab = styled(motion.div)`
  width: 90%;
  height: 25%;
  background-color: white;
  border: 3px solid black;
  box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 35px;
  margin-bottom: 0.5%;
  margin-top: 0.5%;
  border-radius: 20px;
`

export const FontTab = ({children, font, onPress, close}) => {
  return (
    <Tab
      whileHover={{scaleX:1.1}}
      whileTap={{scaleX:0.9}}
      style={{
        fontFamily: font,
      }}
      onClick={()=>{
        onPress(font);
        close();
      }}
    >
      {children}
    </Tab>
  )
}
