import React, { useEffect, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  DrawwitLogo,
  MainBackgroundContainer
} from '../styled_components/common.jsx';
import {
  Footer,
  Header,
  Main,
  MainButton,
  MainForm,
  NameFormDiv,
  NameInput,
  Question,
} from '../styled_components/nameForm.jsx';
import { ErrorMsgDiv } from '../styled_components/apiErrorMessages.jsx';

function NameFormScreen({nameFormSaver, onError, onNext}) {
  const [err, setErr] = useState(false);
  const [username, setUsername] = useState("not initialized");
  const [contestTheme, setContestTheme] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/current-username');
        if (!res.ok) {
          throw new Error(`Error HTTP: ${res.status}`);
        }
        const data = await res.json();
        if (!data.error) {
          setUsername(data.username);
        }
      } catch (err) {
        setErr(err.message || 'unknown error');
      }
    })();
  }, []);

  const onWrite = (e) =>{
    setContestTheme(e.target.value);
  };

  const handleNext = useCallback(() => {
    if (!contestTheme.trim()) {
      onError("Your contest must have a theme!");
      return;
    }

    nameFormSaver({
      aleph: username,
      contestTheme: contestTheme,
      screen: "guessit"
    });

    onNext();
  }, [contestTheme, username, nameFormSaver, onError, onNext]);

  // 👉 Listener de Enter
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
        transition={{ duration: 0.5 }}
      >
        <Header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ type: "tween", duration: 0.5 }}
        >
          <DrawwitLogo
            initial={{ scale: 0, rotateX: -180, opacity: 0 }}
            animate={{ scale: 1, rotateX: 0, opacity: 1 }}
            exit={{ scale: 0.8, rotateX: 180, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 70,
              damping: 14,
              delay: 0.5,
              duration: 0.5,
            }}
          >
            Guessit
          </DrawwitLogo>
        </Header>

        <Main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <MainForm
            initial={{opacity: 0 }}
            animate={{opacity: 1 }}
            exit={{opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Question
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              What is your drawing about?
            </Question>
            <NameInput value={contestTheme} onChange={onWrite}/>
          </MainForm>
        </Main>

        <Footer
          initial={{opacity: 0 }}
          animate={{opacity: 1 }}
          exit={{opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <MainButton
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0}}
            transition={{ duration: 0.5 }}
            whileTap={{ scale: 1.1, rotate: 15 }}
            onClick={handleNext}
          >
            Next
          </MainButton>
        </Footer>
      </NameFormDiv>

      <AnimatePresence initial={false}>
        {err && (
          <ErrorMsgDiv
            key="error-msg"
            initial={{ opacity: 0, scale: 0}}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            {"Houston we have a problem, try reloading the page:"}
            <br />
            <br/>
            {err}
          </ErrorMsgDiv>
        )}
      </AnimatePresence>
    </>
  );
}

export default NameFormScreen;
