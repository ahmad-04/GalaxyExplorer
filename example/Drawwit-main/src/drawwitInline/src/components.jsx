import { styled } from 'styled-components'

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
export const NameContainer = styled.div`
  width: 95%;
  height: 17%;
  border: 3px solid black;
  background-color: #ffbdde;
  border-radius: 20px;
  margin-bottom: 4%;
  box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  text-overflow: ellipsis ;
  text-align: center;
  overflow: hidden;
  @media (max-height: 330px) {
    font-size: 20px;
    border: 1.5px solid black;
  }
`

export const DrawingContainer = styled.div`
  width: 95%;
  height: 75%;
  border: 3px solid black;
  background-color: #ffbdde;
  border-radius: 20px;
  box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  @media (max-height: 330px) {
    border: 1.5px solid black;
  }
`
export const Header = styled.div`
  width: 100%;
  height: 25%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const Ranking = styled.div`
  height: 82%;
  width: 28%;
  background-color: #af25ff;
  border: 3px solid black;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 30px;
  margin-right: 33%;
  border-radius: 17px;
  margin-left: 3%;
  text-align: center;
  box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.2);
  @media (max-height: 330px) {
    font-size: 15px;
    border: 1.5px solid black;
  }
`;

export const Star = styled.div`
  width: 40%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 7%;
`;

export const Stars = styled.div`
  width: 35%;
  height: 82%;
  background-color: white;
  border: 3px solid black;
  display: flex;
  justify-content: space-around;
  align-items: center;
  font-size: 25px;
  border-radius: 20px;
  margin-right: 3%;
  box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.2);
  @media (max-height: 330px) {
    font-size: 15px;
    border: 1.5px solid black;
  }
`;

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
`
