import React, { useEffect, useState } from 'react';
import { MainBackgroundContainer } from '../styled_components/common.jsx';
import { ComingSoon, ComingSoonContainer, MainContainer, Mode, ModesContainer, Prompt, PromptContainer } from '../styled_components/GameModeSelector.jsx';
import { AnimatePresence } from 'framer-motion';

function GamemodeSelector({onDrawwit, onGuessit}) {
  const [width, setWidth] = useState(window.innerWidth);
  const [height, setHeight] = useState(window.innerHeight);

  useEffect(() => {
    function onResize() {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    }
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    }
  }, []);

  function fitRectangle(W, H, Wc, Hc) {
    const scale = Math.min(Wc / W, Hc / H);
    let newWidth = Math.round(W * scale);
    let newHeight = Math.round(H * scale);

    if (newWidth < newHeight) {
      const altScale = Hc / H;
      newWidth = Math.round(W * altScale);
      newHeight = Math.round(H * altScale);
    }

    return {
      width: newWidth,
      height: newHeight,
    };
  }

  return (
    <MainBackgroundContainer>
      <MainContainer
        style={{ width: fitRectangle(700,990,width,height).width, height: fitRectangle(700,990,width,height).height }}
      >
        <PromptContainer>
          <AnimatePresence>
            <Prompt initial={{opacity:0}} animate={{opacity: 1}} exit={{opacity: 0}}>Select your game mode</Prompt>
          </AnimatePresence>
        </PromptContainer>
        <ModesContainer>
          <Mode
            title={"Drawwit (classic)"}
            description={"Create and rate drawings"}
            onClick={onDrawwit}
          />
          <Mode
            title={"Guessit"}
            description={"Draw, guess, or trick."}
            onClick={onGuessit}
          />
        </ModesContainer>
        <ComingSoonContainer>
          <ComingSoon >More Coming Soon...</ComingSoon>
        </ComingSoonContainer>
      </MainContainer>
    </MainBackgroundContainer>
  );
}

export default GamemodeSelector;
