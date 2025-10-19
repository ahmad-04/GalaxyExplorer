import styled from 'styled-components';
import { useState } from 'react';

export const DurationWarning = styled.div`
  height: 15%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25px;
  text-align: center;
  @media (min-width: 710px) and (max-width: 1100px) {
    // desktop
    font-size: 20px;
  }
`

const TimeInputContainer = styled.div`
  height: 42%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`

const InputContainer = styled.div`
  height: 100%;
  width: 20%;
  margin-left: 2.5%;
  margin-right: 2.5%;
`

const TimeInput = styled.input`
  height: 75%;
  width: 100%;
  box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.2);
  background-color: #af25ff;
  border: 4px solid black;
  border-radius: 25px;
  text-align: center;

  @media (min-width: 710px) and (max-width: 1100px) {
    border: 3px solid black;
    border-radius: 15px;
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type=number] {
    -moz-appearance: textfield;
  }
`;

const TimeLabel = styled.div`
  height: 25%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25px;
  @media (min-width: 710px) and (max-width: 1100px) {
    // desktop
    font-size: 20px;
  }
  text-shadow: 4px 4px 4px rgba(0, 0, 0, 0.2);
`

export const TimeHandler = ({onDay, onHour,onMinute}) => {

  return (
    <TimeInputContainer>
      <InputContainer>
        <TimeInput
          type="number"
          onChange={onDay}
        ></TimeInput>
        <TimeLabel>Days</TimeLabel>
      </InputContainer>
      <InputContainer>
        <TimeInput
          type="number"
          onChange={onHour}
        ></TimeInput>
        <TimeLabel>Hours</TimeLabel>
      </InputContainer>
      <InputContainer>
        <TimeInput
          type="number"
          onChange={onMinute}
        ></TimeInput>
        <TimeLabel>Minutes</TimeLabel>
      </InputContainer>
    </TimeInputContainer>
  )
}

