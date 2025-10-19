import { useEffect, useState } from 'react';
import NameFormScreen from './Guessit_contest_theme.jsx';
import { ErrorMsg } from '../styled_components/userErrorMessage.jsx';
import { MainBackgroundContainer } from '../styled_components/common.jsx';
import { AnimatePresence } from 'framer-motion';
import GuessitDurationFormScreen from './Guessit_duration.jsx';
import { GuessitDesktopWarning } from './Guessit_desktop_warning.jsx';
import GuessitDesktopCanvas from './Drawwit_desktop_canvas.jsx';
import { navigateTo } from '@devvit/web/client';

function Guessit() {
  const [err, setErr] = useState(null);
  const [appStage, setAppStage] = useState("name");

  const [motherHash, setMotherHash] = useState({});

  const [width, setWidth] = useState(window.innerWidth);

  const [isLoading, setIsLoading] = useState(null)

  useEffect(() => {
    const handleMessage = async (event) => {
      try {
        await devvitLog(`---Got this from blocks: ${JSON.stringify(event.data)}`);
      } catch (err) {
        (()=>{})();
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  async function devvitLog(message) {
    try {
      const res = await fetch('/api/log-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`error logging, please contact u/Ibaniez ${res.status}. ${text}`);
      }
    } catch (err) {
      setErr(err);
    }
  }

  useEffect(() => {

    const handleResize = () => setWidth(window.innerWidth);

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (motherHash.aleph && motherHash.contestTheme && motherHash.screen) {
      const logUser = async () => {
        try {
          await devvitLog(`---User ${motherHash.aleph} has initiated contest creation---`);
          await devvitLog(`--------${motherHash.aleph} contest theme: ${motherHash.contestTheme}`);
          await devvitLog(`--------${motherHash.aleph} contest screen: ${motherHash.screen}`);
        } catch (err) {
          setErr(`Error logging , please contact u/Ibaniez ${err}`)
        }
      };
      logUser();
    }
  }, [motherHash.aleph, motherHash.contestTheme, motherHash.screen]);

  useEffect(() => {
    const hasDuration =
      ['deadlineDays', 'deadlineHours', 'deadlineMinutes']
        .every((k) => motherHash[k] !== undefined && motherHash[k] !== null);

    if (hasDuration && motherHash.kickoffDate) {
      const logUser = async () => {
        try {
          await devvitLog(`--------${motherHash.aleph} contest days deadline: ${motherHash.deadlineDays}`);
          await devvitLog(`--------${motherHash.aleph} contest hours deadline: ${motherHash.deadlineHours}`);
          await devvitLog(`--------${motherHash.aleph} contest minutes deadline: ${motherHash.deadlineMinutes}`);
          await devvitLog(`--------${motherHash.aleph} contest kickoff: ${JSON.stringify(motherHash.kickoffDate)}`);
        } catch (err) {
          setErr(`Error logging , please contact u/Ibaniez ${err}`);
        }
      };
      logUser();
    }
  }, [motherHash.deadlineDays, motherHash.deadlineHours, motherHash.deadlineMinutes, motherHash.kickoffDate]);



  const renderScreen = () => {
    if (appStage === "name") {
      return (
        <NameFormScreen
          onError={(errorMessage) => setErr(errorMessage)}
          nameFormSaver={(hash) => {
            setMotherHash((prev) => ({
              ...prev,
              aleph: hash.aleph,
              contestTheme: hash.contestTheme,
              screen: hash.screen
            }));
          }}
          onNext={() => {
            setAppStage("duration");
          }}
        />
      );
    } else if (appStage === "duration") {
      return (
        <GuessitDurationFormScreen
          onError={(errorMessage) => setErr(errorMessage)}
          durationFormSaver={(hash) => {
            setMotherHash((prev) => ({
              ...prev,
              deadlineDays: hash.deadlineDays,
              deadlineHours: hash.deadlineHours,
              deadlineMinutes: hash.deadlineMinutes,
              kickoffDate: hash.kickoffDate
            }))
          }}
          onNext={() => { setAppStage("canvas"); }}
        />
      );
    } else if (appStage === "canvas" && width > 710 && width < 1100) {
      return (
        <>
          <GuessitDesktopWarning
            key = "canvas"
          ></GuessitDesktopWarning>
        </>
      );
    } else if (appStage === "canvas" && width >= 1100) {
      return (
        <>
          <GuessitDesktopCanvas
            onGetDrawing={async (canvas) => {
              try {
                setIsLoading(true)
                setErr("Loading ...")

                const response = await fetch('/api/upload-image', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    url: `${canvas}`,
                    type: 'jpg',
                  }),
                });

                const imageUrl = await response.text();

                // segundo fetch
                const body = {
                  motherHash: motherHash,
                  drawing: imageUrl,
                };

                const res = await fetch('/api/guessit/set', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                });

                const data = await res.json();
                navigateTo(data.postUrl)
                // logs
                await devvitLog(`-------contest link: ${data.postUrl}`);
                await devvitLog(`-------drawwit/set response: ${JSON.stringify(data)}`);
                await devvitLog(`-------api/upload-image response: ${JSON.stringify(imageUrl)}`);

              } catch (err) {
                setErr(`something went wrong, try again: ${err} if problem persist contact u/Ibaniez`);
              }
            }}
          />
        </>
      );
    } else {
      return null;
    }
  };

  return (
    <>
      {err && (
        <MainBackgroundContainer>
          <ErrorMsg
            key={"error"}
            message={err}
            onOk={() => {
              if (!isLoading){
                setErr(null)
              }
            }}
          />
        </MainBackgroundContainer>
      )}
      {!err && (
        <MainBackgroundContainer>
          <AnimatePresence mode={"wait"}>
            {renderScreen()}
          </AnimatePresence>
        </MainBackgroundContainer>
      )}
    </>
  )
}

export default Guessit;
