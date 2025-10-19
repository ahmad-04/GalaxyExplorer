import React, { useEffect, useState } from 'react';
import { MainBackgroundContainer } from '../styled_components/common.jsx';
import background from '/background.png';
import {
  CanvasMainContainer,
  Toolbar,
  ToolbarContainer,
  ToolContainer,
  ToolsMainContainer,
  Tool,
  ButtonContainer, AccesibilityButton, CreateContestButton, CanvasDesign, DrawingTitle, DeletingModeAdvisor,
} from '../styled_components/canvas.jsx';
import Pencil from '/Pencil.png';
import Eraser from '/Eraser.png';
import Shapes from '/Shapes.png';
import Text from '/Text.png';
import FabricCanvas from './Fabric_canvas.jsx';
import DrawwitTextSelector from './Drawwit_text_selector.jsx';
import { AnimatePresence } from 'framer-motion';

function GuessitDesktopCanvas({onGetDrawing}) {
  const [width, setWidth] = useState(window.innerWidth);
  const [height, setHeight] = useState(window.innerHeight);
  const [selectedButton, setSelectedButton] = useState("none");

  const [getCanvas, setGetCanvas] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
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
    <div
      className="CanvasContainer"
      style={{
        width: fitRectangle(840, 460, width, height).width,
        height: fitRectangle(840, 460, width, height).height,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
      }}
    >
      <CanvasMainContainer>
        <DrawingTitle
          initial={{x: -100}}
          animate={{x:0}}
          transition={{duration: 0.5}}
        >
          Epic Face
        </DrawingTitle>
        <FabricCanvas
          widthOfCanvas={0.9 * 0.65 *fitRectangle(840, 460, width, height).width}
          heightOfCanvas={0.75 * fitRectangle(840, 460, width, height).height}
          getCanvas={getCanvas}
          onGetCanvas={(canvas)=>{
            onGetDrawing(canvas);
          }}
        >
        </FabricCanvas>
      </CanvasMainContainer>
      <AnimatePresence mode={"wait"}>
        <ToolsMainContainer key="toolsMainContainer">
          {selectedButton === "pencil" && (
            <DrawwitTextSelector
              key="textSelector"
              onClose={() => setSelectedButton("none")}
            />
          )}

          {selectedButton === "none" && (
            <React.Fragment key="toolbarAndButton">
              <ToolbarContainer key="toolbarContainer">
                <Toolbar key="toolbar">
                  <ToolContainer key="toolContainer-pencil">
                    <Tool
                      key="tool-pencil"
                      onClick={() => setSelectedButton("pencil")}
                      initial={{ x: 100 }}
                      animate={{ x: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.5 }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        border:
                          selectedButton === "pencil"
                            ? "4px solid white"
                            : "4px solid black",
                      }}
                    >
                      <img key="img-pencil" src={Pencil} height={"92%"} width={"75%"} />
                    </Tool>
                  </ToolContainer>

                  <ToolContainer key="toolContainer-eraser">
                    <Tool
                      key="tool-eraser"
                      onClick={() => setSelectedButton("eraser")}
                      initial={{ x: 100 }}
                      animate={{ x: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.5 }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        border:
                          selectedButton === "eraser"
                            ? "4px solid white"
                            : "4px solid black",
                      }}
                    >
                      <img key="img-eraser" src={Eraser} height={"75%"} width={"65%"} />
                    </Tool>
                  </ToolContainer>

                  <ToolContainer key="toolContainer-shapes">
                    <Tool
                      key="tool-shapes"
                      onClick={() => setSelectedButton("shapes")}
                      initial={{ x: 100 }}
                      animate={{ x: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.5 }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        border:
                          selectedButton === "shapes"
                            ? "4px solid white"
                            : "4px solid black",
                      }}
                    >
                      <img key="img-shapes" src={Shapes} height={"70%"} width={"60%"} />
                    </Tool>
                  </ToolContainer>

                  <ToolContainer key="toolContainer-text">
                    <Tool
                      key="tool-text"
                      onClick={() => setSelectedButton("text")}
                      initial={{ x: 100 }}
                      animate={{ x: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.5 }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        border:
                          selectedButton === "text"
                            ? "4px solid white"
                            : "4px solid black",
                      }}
                    >
                      <img key="img-text" src={Text} height={"90%"} width={"70%"} />
                    </Tool>
                  </ToolContainer>
                </Toolbar>
              </ToolbarContainer>

              <ButtonContainer key="buttonContainer">
                <CreateContestButton
                  key="createContestButton"
                  initial={{ y: -100, scale: 0 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: -100, scale: 0 }}
                  transition={{ duration: 0.5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={()=>{
                    setGetCanvas(true)
                  }}
                >
                  Create Contest
                </CreateContestButton>
              </ButtonContainer>
            </React.Fragment>
          )}
        </ToolsMainContainer>
      </AnimatePresence>
    </div>
  );
}

export default GuessitDesktopCanvas;
