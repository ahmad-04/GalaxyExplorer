import styled from 'styled-components';
import background from '/background.png';
import { motion } from 'framer-motion';
//---sizes---//
// mobile 0 < x <= 710 px
// desktop 710 < x < 1100 px
// fullscreen  1100px <= x
// @media (max-width: 710px) {
//   // mobile
// }
// @media (min-width: 710px) and (max-width: 1100px) {
//   // desktop
// }


export const MainBackgroundContainer = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center; 
  align-items: center;
  border: 4px solid black;
  background-image: url("${background}");
  font-size: 50px;
  font-family: 'Gloria Hallelujah', cursive;
  position: relative;
  overflow: hidden;
`
export const DrawwitLogo = styled(motion.div)`
  box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.2);
  text-shadow: 4px 4px 4px rgba(0, 0, 0, 0.2);
  width: 50% ;
  height: 80% ;
  background-color: #ffbdde;
  border-radius: 25px;
  border: 4px solid black;
  @media (max-width: 710px) {
    // mobile
    height: 60%;
    width: 70%;
    font-size: 80px ;
  }
  @media (min-width: 710px) and (max-width: 1100px) {
    // desktop
    width:60%;
    font-size: 60px;
    border: 3px solid black;
    border-radius: 15px;
  }
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 100px;
`
