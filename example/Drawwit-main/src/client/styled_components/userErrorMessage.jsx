import styled from 'styled-components';
import { motion } from 'framer-motion';

const Backdrop = styled(motion.div)`
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.76);
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  z-index: 90;
`

const ErrorMsgDiv = styled(motion.div)`
  width: 85%;
  height: 60%;
  @media (max-width: 710px) {
    // mobile
    height: 40%;
    width: 90%;
  }
  background-color: #ffbdde;
  border-radius: 25px;
  border: 4px solid black;
  text-align: center;
  font-size: 50px;
  z-index: 99;
  transform: translate(-50%,-50%);
`
const MessageDiv = styled.div`
  width: 100%;
  height: 75%;
  display: flex;
  justify-content: center;
  align-items: center;
  border-bottom: 4px solid black;
  @media (max-width: 710px) {
    // mobile
    font-size: 50px;
  }
`
const OkDiv = styled.div`
  width: 100%;
  height: 25%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #fabfff;
  border-radius: 25px;
`

const Message = styled.div`
  width: 70%;
  height: 95%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 80px;
  @media (min-width: 710px) and (max-width: 1100px) {
    //desktop
    font-size: 50px;
  }
  @media (max-width: 710px) {
    // mobile
    width: 90%;
    height: 100%;
    font-size: 50px;
  }
  text-shadow: 4px 4px 4px rgba(0, 0, 0, 0.2);
`

const Ok = styled(motion.div)`
  width: 20%;
  height: 90%;
  border-radius: 25px;
  border: 4px solid black;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #af25ff;
  @media (min-width: 710px) and (max-width: 1100px) {
    //desktop
    font-size: 30px;
  }
  @media (max-width: 710px) {
    // mobile
    font-size: 50px;
    width: 40%;
  }
  font-size: 80px;
  user-select: none;
  text-shadow: 4px 4px 4px rgba(0, 0, 0, 0.2);
`

export const ErrorMsg = ({message, onOk}) => {
  return (
    <Backdrop
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      exit={{opacity: 0}}
    >
      <ErrorMsgDiv
        initial={{scale: 0}}
        animate={{scale: 1}}
        transition={{duration: 0.2}}
        exit={{scale: 0}}
      >
        <MessageDiv>
          <Message>
            {message}
          </Message>
        </MessageDiv>
        <OkDiv>
          <Ok
            whileTap={{scale: 1.1}}
            onClick={onOk}
          >Ok</Ok>
        </OkDiv>
      </ErrorMsgDiv>
    </Backdrop>
  )
}
