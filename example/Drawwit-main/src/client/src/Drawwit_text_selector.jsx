import React, { useEffect, useState } from 'react';
import {
  Backdrop,
  CloseFontDisplay,
  CloseFontDisplayContainer,
  CloseIcon,
  Color,
  ColorContainer,
  ColorLabel,
  Container,
  FontList,
  FontListContainer,
  FontOptions,
  FontSelectorHeader, FontTab,
  FontTitle,
  HeaderContainer,
  MainContainer,
  SelectorContainer,
  SelectorFont,
  SmallSelector,
  Snippet,
  SnippetClassHolder,
  SnippetHeaderline,
  StyleContainer,
  StyleLabel,
  TitleContainer,
} from '../styled_components/selectors.jsx';
import { AnimatePresence } from 'framer-motion';

function DrawwitTextSelector({onClose, config, onSelectFont}) {
  const [currentScreen, setCurrentScreen] = useState("none");
  const [selectedFont, setSelectedFont] = useState("")

  async function devvitLog(message) {
    await fetch('/api/log-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
  }

  useEffect(() => {
    async function logConfig(){
      await devvitLog(config);
    }
    if (config?.fontFamily) {
      setSelectedFont(config.fontFamily);
    }
    logConfig();
  },[config])

  useEffect(() => {
    onSelectFont(selectedFont);
  }, [selectedFont]);

  return (
    <AnimatePresence mode={"wait"}>
      <MainContainer
        key="mainContainer"
        initial={{x: 100, opacity: 0}}
        animate={{x:0, opacity: 1}}
        transition={{duration: 0.5}}
        exit={{x: 100, opacity: 0}}
      >
        {currentScreen === "none" && (
          <CloseIcon
            onClick={onClose}
          >X</CloseIcon>
        )}
        <TitleContainer>Text</TitleContainer>
        <Snippet
        >
          <HeaderContainer>
            <SnippetClassHolder>font</SnippetClassHolder>
            <SnippetHeaderline></SnippetHeaderline>
          </HeaderContainer>
          <SelectorContainer>
            <SelectorFont
              whileTap={{scale:1.1}}
              onClick={()=>{
                setCurrentScreen("font");
              }}
            >
              {selectedFont.split(",")[0].replace(/"/g, "").trim()}
            </SelectorFont>
          </SelectorContainer>
        </Snippet>
        <Snippet>
          <HeaderContainer>
            <SnippetClassHolder>style</SnippetClassHolder>
            <SnippetHeaderline></SnippetHeaderline>
          </HeaderContainer>
          <SelectorContainer
          >
            <StyleContainer>
              <Container>
                <StyleLabel>Style</StyleLabel>
                <SmallSelector
                  whileTap={{scale:1.1}}
                >32</SmallSelector>
              </Container>
            </StyleContainer>
            <StyleContainer>
              <Container>
                <StyleLabel>Size</StyleLabel>
                <SmallSelector
                  whileTap={{scale:1.1}}
                >32</SmallSelector>
              </Container>
            </StyleContainer>
          </SelectorContainer>
        </Snippet>
        <Snippet>
          <HeaderContainer>
            <SnippetClassHolder>Color</SnippetClassHolder>
            <SnippetHeaderline></SnippetHeaderline>
          </HeaderContainer>
          <SelectorContainer>
            <StyleContainer>
              <Container
                style={{
                  width: '90%',
                }}
              >
                <StyleLabel>Style</StyleLabel>
                <SmallSelector
                  whileTap={{scale:1.1}}
                >
                  <ColorContainer>
                    <Color/>
                  </ColorContainer>
                  <ColorLabel>
                    #003fff
                  </ColorLabel>
                </SmallSelector>
              </Container>
            </StyleContainer>
            <StyleContainer>
              <Container
                style={{
                  width: '90%',
                }}
              >
                <StyleLabel>Size</StyleLabel>
                <SmallSelector
                  whileTap={{scale:1.1}}
                >
                  <ColorContainer>
                    <Color/>
                  </ColorContainer>
                  <ColorLabel
                  >
                    #003fff
                  </ColorLabel>
                </SmallSelector>
              </Container>
            </StyleContainer>
          </SelectorContainer>
        </Snippet>
        {
          currentScreen === "font" && (
            <AnimatePresence mode={"wait"}>
              <Backdrop
                initial={{opacity:0}}
                animate={{opacity:1}}
                transition={{duration: 0.2}}
                exit={{opacity:0}}
              >
                <FontOptions
                  initial={{scale:0}}
                  animate={{scale:1}}
                  transition={{duration: 0.2}}
                  exit={{scale:0}}
                >
                  <FontSelectorHeader>
                    <FontTitle>Select the font</FontTitle>
                    <CloseFontDisplayContainer>
                      <CloseFontDisplay
                        whileTap={{scale:1.1}}
                        onClick={()=>{setCurrentScreen("none")}}
                      >X</CloseFontDisplay>
                    </CloseFontDisplayContainer>
                  </FontSelectorHeader>
                  <FontListContainer>
                    <FontList>
                      <FontTab font="Arial, Helvetica, sans-serif" onPress={setSelectedFont} close={()=>{setCurrentScreen("none")}}>
                        Arial
                      </FontTab>
                      <FontTab font="Verdana, Geneva, sans-serif" onPress={setSelectedFont} close={()=>{setCurrentScreen("none")}}>
                        Verdana
                      </FontTab>
                      <FontTab font="Tahoma, Geneva, sans-serif" onPress={setSelectedFont} close={()=>{setCurrentScreen("none")}}>
                        Tahoma
                      </FontTab>
                      <FontTab font='"Trebuchet MS", Helvetica, sans-serif' onPress={setSelectedFont} close={()=>{setCurrentScreen("none")}}>
                        Trebuchet MS
                      </FontTab>
                      <FontTab font='"Times New Roman", Times, serif' onPress={setSelectedFont} close={()=>{setCurrentScreen("none")}}>
                        Times New Roman
                      </FontTab>
                      <FontTab font="Georgia, serif" onPress={setSelectedFont} close={()=>{setCurrentScreen("none")}}>
                        Georgia
                      </FontTab>
                      <FontTab font='"Courier New", Courier, monospace' onPress={setSelectedFont} close={()=>{setCurrentScreen("none")}}>
                        Courier New
                      </FontTab>
                    </FontList>
                  </FontListContainer>
                </FontOptions>
              </Backdrop>
            </AnimatePresence>
          )
        }
      </MainContainer>
    </AnimatePresence>
  );
}

export default DrawwitTextSelector;
