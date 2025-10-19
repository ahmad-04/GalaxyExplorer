import { useEffect, useRef, useState } from 'react';
import { CanvasDesign } from '../styled_components/canvas.jsx';
import { Canvas, IText } from 'fabric';

function FabricCanvas({
                        widthOfCanvas,
                        heightOfCanvas,
                        getCanvas,
                        onGetCanvas,
                        addedText,
                        onAddText,
                        onSelectText,
                        textNodeConfig,
                        currentTextNode,
                        onChangeTextList
                      }) {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);

  const[ textList, setTextList ] = useState([]);

  useEffect(() => {
    onChangeTextList(textList);
  }, [textList]);

  const updateText = (id, newProps) => {
    const object = textList.find((t) => t.id === id);
    if (object && fabricCanvasRef.current) {
      object.set(newProps);
      fabricCanvasRef.current.requestRenderAll();
    }
  };

  useEffect(()=>{
    updateText(currentTextNode,textNodeConfig);
  },[currentTextNode, textNodeConfig])


  useEffect(() => {
    if (!canvasRef.current) return;

    if (!fabricCanvasRef.current) {
      const canvas = new Canvas(canvasRef.current, {
        width: widthOfCanvas - 20,
        height: heightOfCanvas - 20,
      });

      fabricCanvasRef.current = canvas;
      canvas.backgroundColor = '#fff';
      canvas.renderAll();
    }

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setWidth(widthOfCanvas - 20);
      fabricCanvasRef.current.setHeight(heightOfCanvas - 20);
      fabricCanvasRef.current.renderAll();
    }
  }, [widthOfCanvas, heightOfCanvas]);

  useEffect(() => {
    if (fabricCanvasRef.current && onGetCanvas && getCanvas) {
      const base64 = fabricCanvasRef.current.toDataURL({
        format: 'jpeg',
        quality: 0.1,
      });
      onGetCanvas(base64);
    }
  }, [getCanvas]);

  useEffect(() => {
    if (addedText && fabricCanvasRef.current) {
      const text = new IText('Click to add Text', {
        left: widthOfCanvas/2,
        top: heightOfCanvas/2,
        fontSize: addedText.fontSize,
        fill: addedText.fill,
        fontFamily: addedText.fontFamily,
        selectable: true,
        editable: true,
      });

      fabricCanvasRef.current.add(text);
      fabricCanvasRef.current.setActiveObject(text);
      fabricCanvasRef.current.requestRenderAll();

      setTextList((prev) => [...prev, text]);

      text.on('selected', () => {
        onSelectText(textList.indexOf(textList.at(-1)))
      });

      text.on('deselected', () => {
      });

      onAddText({
        ...textList.at(-1),
        id: textList.indexOf(textList.at(-1))
      });
    }
  }, [addedText]);

  return (
    <CanvasDesign
      initial={{ x: -100 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <canvas ref={canvasRef} id="fabric-canvas" />
    </CanvasDesign>
  );
}

export default FabricCanvas;
