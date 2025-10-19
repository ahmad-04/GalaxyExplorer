import { styled } from 'styled-components';

export const Background = styled.div`
  height: 100%;
  width: 100%;
  background-size: cover;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  font-family: 'Gloria Hallelujah', cursive;
`
export const Question = styled.div`
  width: 95%;
  height: 25%;
  border: 3px solid black;
  background-color: #ffbdde;
  box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.2);
  font-size: 32px;
  display: flex;
  border-radius: 20px ;
  justify-content: center;
  align-items: center;
  text-align: center;
  @media (max-height: 330px) {
    font-size: 20px;
    border: 1.5px solid black;
  }
  margin-bottom:2.5%;
`

export const Drawing = styled.div`
  width: 243.27px;
  height: 172.22px;
  border: 3px solid black;
  background-color: white;
  border-radius: 20px ;
  box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: center;
  align-items: center ;
  @media (max-height: 330px) {
    border: 1.5px solid black;
  }
  margin-top:2.5%;
`
