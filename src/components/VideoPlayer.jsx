import { useEffect, useRef, useState } from "react";
import * as faceapi from '@vladmandic/face-api';
import './VideoPlayer.css';

const VideoPlayer = ( {setExpression} ) => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [emotion, setEmotion] = useState("");


  useEffect(() => {
    async function init() {
      await loadModels();
      startVideo();
      faceMyDetect();
    }
    init();
  }, [videoRef, canvasRef]);

  const startVideo = async () => {
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = currentStream;
    } catch (error) {
      console.error(error);
    }
  };

  const loadModels = async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/model"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/model"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/model"),
      faceapi.nets.faceExpressionNet.loadFromUri("/model"),
    ]);
  };

  const faceMyDetect = () => {
    const expressionHistory = [];

    setInterval(async () => {
      const detections = await faceapi.detectAllFaces(videoRef.current,
        new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
       if(detections.length > 0) {
         updateCanvas(detections, expressionHistory);
         console.log("detections" , detections)
       }
    }, 1000);
    
  };

  const updateCanvas = (detections, expressionHistory) => {

    canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(videoRef.current);
    faceapi.matchDimensions(canvasRef.current, { width: 600, height: 500 });

    const expressions = detections[0]?.expressions;
    
    if (expressions) {
      setExpression(expressions)
      const { maxExpression, maxProbability } = findMaxExpression(expressions);

      // console.log("Detected emotion:", maxExpression);
      // console.log("Probability:", maxProbability);

      expressionHistory.push(maxExpression);
      // console.log(expressionHistory);

      if (expressionHistory.length >= 10) {
        const predominantExpression = findPredominantExpression(expressionHistory);
        // console.log("Predominant emotion in the last 10 detections:", predominantExpression);
        setEmotion(predominantExpression);
        recommendMusic(predominantExpression);
        expressionHistory.length = 0;
      }
    }

    const resized = faceapi.resizeResults(detections, { width: 600, height: 500 });

    faceapi.draw.drawDetections(canvasRef.current, resized);
    faceapi.draw.drawFaceLandmarks(canvasRef.current, resized);
    faceapi.draw.drawFaceExpressions(canvasRef.current, resized);
  };

  const findMaxExpression = (expressions) => {
    let maxExpression = "";
    let maxProbability = 0;

    Object.entries(expressions).forEach(([emotion, probability]) => {
      if (probability > maxProbability) {
        maxProbability = probability;
        maxExpression = emotion;
      }
    });

    return { maxExpression, maxProbability };
  };

  const findPredominantExpression = (expressionHistory) => {
    const expressionCounts = expressionHistory.reduce((counts, expression) => {
      counts[expression] = (counts[expression] || 0) + 1;
      return counts;
    }, {});

    return Object.keys(expressionCounts).reduce((a, b) => expressionCounts[a] > expressionCounts[b] ? a : b);
  };

  const recommendMusic = (emotion) => {
    console.log("Recommend music based on emotion:", emotion);
  };

  
  return (
    <div className="container">
      <video
        crossOrigin="anonymous"
        ref={videoRef}
        className="appvide rounded-lg overflow-hidden"
        autoPlay
      ></video>
      <canvas className='appcanvas w-full h-full border ' ref={canvasRef} ></canvas>
      <h4>{emotion}</h4>

    </div>
  );
};

export default VideoPlayer;
