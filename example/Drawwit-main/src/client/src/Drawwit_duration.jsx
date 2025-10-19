import React, { useEffect, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  DrawwitLogo,
} from '../styled_components/common.jsx';
import {
  Footer,
  Header,
  Main,
  MainButton,
  MainForm,
  NameFormDiv,
  Question,
} from '../styled_components/nameForm.jsx';
import { ErrorMsgDiv } from '../styled_components/apiErrorMessages.jsx';
import { DurationWarning, TimeHandler } from '../styled_components/durationForm.jsx';

function DurationFormScreen({durationFormSaver, onError, onNext}) {
  const [deadlineDays, setDeadlineDays] = useState(0);
  const [deadlineHours, setDeadlineHours] = useState(0);
  const [deadlineMinutes, setDeadlineMinutes] = useState(0);

  const [kickoffDate, setKickoffDate] = useState({});

  useEffect(() => {
    const now = new Date();
    setKickoffDate({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes()
    });
  }, []);

  const handleNext = useCallback(() => {
    const totalMinutes = deadlineDays * 24 * 60 + deadlineHours * 60 + deadlineMinutes;

    const minMinutes = 60;          // 1 hora
    const maxMinutes = 6 * 24 * 60; // 6 días

    if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
      onError("Duration out of range. Allowed: 1 hour – 6 days.");
      return;
    }

    durationFormSaver({
      deadlineDays: deadlineDays,
      deadlineHours: deadlineHours,
      deadlineMinutes: deadlineMinutes,
      kickoffDate: kickoffDate
    });

    onNext();
  }, [deadlineDays, deadlineHours, deadlineMinutes, onError, onNext]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleNext]);

  return (
    <>
      <NameFormDiv
        key="name-form-root"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ type: "tween", duration: 0.25 }}
        >
          <DrawwitLogo
            initial={{ scale: 0, rotateX: -180, opacity: 0 }}
            animate={{ scale: 1, rotateX: 0, opacity: 1 }}
            exit={{ scale: 0.8, rotateX: 180, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 70,
              damping: 14,
              delay: 0.2,
              duration: 0.2,
            }}
          >
            Drawwit
          </DrawwitLogo>
        </Header>
        <Main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <MainForm
            initial={{opacity: 0}}
            animate={{opacity: 1 }}
            exit={{opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Question
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                height: "43%",
              }}
            >
              How long is your contest?
            </Question>
            <DurationWarning>Contest duration: 1 hour to 6 days.</DurationWarning>
            <TimeHandler
              onDay={(e)=> setDeadlineDays(parseInt(e.target.value || 0))}
              onHour={(e)=> setDeadlineHours(parseInt(e.target.value || 0))}
              onMinute={(e)=> setDeadlineMinutes(parseInt(e.target.value || 0))}
            />
          </MainForm>
        </Main>

        <Footer
          initial={{opacity: 0 }}
          animate={{opacity: 1 }}
          exit={{opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <MainButton
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0}}
            transition={{ duration: 0.2 }}
            whileTap={{ scale: 1.1, rotate: 15 }}
            onClick={handleNext}
          >
            Next
          </MainButton>
        </Footer>
      </NameFormDiv>
    </>
  );
}

export default DurationFormScreen;
