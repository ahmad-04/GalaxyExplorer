import styled from 'styled-components';
import { motion } from 'framer-motion';
export const WarningContainer = styled(motion.div)`
  width: 100%;
  height: 100%;
  border: 4px solid white;
  @media (min-width: 710px) and (max-width: 1100px) {
    // desktop
    border: 3px solid white;
  }
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 50px;
  text-align: center;
  background-color: black;
`
