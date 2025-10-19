import styled from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';

export const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
`

export const PromptContainer = styled.div`
  height: 22%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`
export const ModesContainer = styled.div`
  height: 60%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`
export const ComingSoonContainer = styled(motion.div)`
  height: 18%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`
export const ComingSoon = styled.div`
  width: 80%;
  height: 80%;
  border-radius: 20px;
  font-size: 33px;
  border: 3px solid white;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  background-color: black;
  box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.2);
  text-align: center;
  @media (max-width: 710px) {
    border: 5px solid white;
    font-size: 50px;
  }
`

export const Prompt = styled(motion.div)`
  width: 80%;
  height: 70%;
  background-color: #ffbdde;
  border: 3px solid black;
  border-radius: 20px;
  box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.2);
  text-shadow: 4px 4px 4px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 35px;
  @media (max-width: 710px) {
    border: 5px solid black;
    font-size: 50px;
  }
`

const ModeDiv = styled(motion.div)`
  width: 90%;
  height: 45%;
  background-color: #fabfff;
  border: 3px solid black;
  border-radius: 20px;
  box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  margin-bottom: 2.5%;
  margin-top: 2.5%;
  font-size: 30px;
  @media (max-width: 710px) {
    border: 5px solid black;
    font-size: 50px;
  }
`
const Title = styled.div`
  width: 100%;
  height: 28%;
  background-color: #af25ff;
  border-bottom: 3px solid black;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  box-shadow: 0 4px 4px 0 rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  text-shadow: 4px 4px 4px rgba(0, 0, 0, 0.2);
  text-align: center;
  @media (max-width: 710px) {
    border-bottom: 5px solid black;
  }
  user-select: none;
`
const Text = styled.div`
  width: 100%;
  height: 72%;
  display: flex;
  justify-content: center;
  align-items: center;
  text-shadow: 4px 4px 4px rgba(0, 0, 0, 0.2);
  text-align: center;
  user-select: none;
`

export const Mode = ({title, description, onClick}) => {
  return (
    <AnimatePresence mode={"wait"}>
      <ModeDiv
        initial={{opacity:0}}
        animate={{opacity: 1}}
        exit={{opacity:0}}
        whileTap={{rotate:12}}
        whileHover={{rotate:10}}
        onClick={onClick}
      >
        <Title>{title}</Title>
        <Text>{description}</Text>
      </ModeDiv>
    </AnimatePresence>
  )
}
