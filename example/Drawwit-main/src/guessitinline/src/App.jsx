import { useEffect, useState } from 'react';
import { Background, Drawing, Question } from './components.jsx';
import BG from '/background.png';
import LG from '/Loading.png';

function App() {
  const [imageUrl, setImageUrl] = useState(LG);

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
    async function fetchImage() {
      const postIdRes = await fetch('/api/post-id');
      const postIdData = await postIdRes.json();
      const postId = postIdData.postId;

      if (postIdData.ok === false) {
        await devvitLog(postIdData.error);
        return;
      }

      const imageRes = await fetch(`/api/redis/get/${postId}-drawing`);
      const imageData = await imageRes.json();

      if (imageData.ok === false) {
        setImageUrl(imageData.error);
        await devvitLog(imageData.error);
        return;
      }

      setImageUrl(imageData.value);
    }
    fetchImage();
  }, []);
  return (
    <>
      <Background style={{ backgroundImage: 'url(' + BG + ')' }}>
        <Question >What is going on?</Question>
        <Drawing>
          <img src={imageUrl} height={'95%'} width={'95%'} />
        </Drawing>
      </Background>
    </>
  )
}

export default App
