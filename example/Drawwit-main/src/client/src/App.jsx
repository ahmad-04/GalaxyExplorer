import React, { useEffect, useState } from 'react';
import Drawwit from './Drawwit.jsx';
import GamemodeSelector from './Gamemode_selector.jsx';
import { AnimatePresence } from 'framer-motion';
import Guessit from './Guessit.jsx';

function App() {

  const [currentScreen, setCurrentScreen] = useState("selector");

  if(currentScreen === "selector") {
    return (
      <GamemodeSelector
        onDrawwit={()=>{setCurrentScreen("drawwit")}}
        onGuessit={()=>{setCurrentScreen("guessit")}}/>
    )
  }else if(currentScreen === "drawwit") {
    return (
      <AnimatePresence mode={"wait"}>
        <Drawwit />
      </AnimatePresence>
    )
  }else if (currentScreen === "guessit") {
    return (
      <AnimatePresence mode={"wait"}>
        <Guessit/>
      </AnimatePresence>
    )
  }
}

export default App;
