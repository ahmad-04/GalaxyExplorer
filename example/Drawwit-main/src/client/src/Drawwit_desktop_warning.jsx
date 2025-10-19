import React from 'react';
import { WarningContainer } from '../styled_components/drawwitWarnings.jsx';

export const DrawwitDesktopWarning = () => {
  return (
    <>
      <WarningContainer
        initial={{scale: 0}}
        animate={{scale: 1}}
        transition={{duration: 0.2}}
      >
        Please open fullscreen mode.
      </WarningContainer>
    </>
  )
}
