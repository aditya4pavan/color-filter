"use client";
import { use, useEffect, useRef, useState } from "react";
import "@mediapipe/face_detection";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import * as faceDetection from "@tensorflow-models/face-detection";
import { MediaPipeFaceDetectorTfjsModelConfig } from "@tensorflow-models/face-detection";
import Tracker from "./tracker";

type Coordinates = {
  x: number;
  y: number;
};

const DELTA_X = 640;
const DELTA_Y = 480;
const ALPHA = 0.1;

const getTheme = () => {
  if (typeof window === "undefined") return { matches: false };
  return window.matchMedia("(prefers-color-scheme: dark)");
};

export default function ImageEnhancer() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const startRef = useRef<boolean>(false);
  const detectorRef = useRef<faceDetection.Face[]>([]);
  const revealRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const darkThemeMq = getTheme();

  const [timer, setTimer] = useState<number>(5);

  const [coordinates, setCoordinates] = useState<Coordinates>({ x: 0, y: 0 });

  const startModel = async () => {
    try {
      const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
      const detectorConfig: MediaPipeFaceDetectorTfjsModelConfig = {
        runtime: "tfjs",
        modelType: "full",
        maxFaces: 1,
      };
      const detector = await faceDetection.createDetector(model, detectorConfig);
      const estimationConfig = { flipHorizontal: false };
      const detectFaces = async () => {
        if (videoRef.current) {
          const faces = await detector.estimateFaces(videoRef.current, estimationConfig);
          detectorRef.current = faces;
          if (faces.length > 0) {
            handleEyeMovement(faces[0]);
          }
        }
        if (startRef.current) requestAnimationFrame(detectFaces);
        else detectorRef.current = [];
      };
      if (startRef.current) requestAnimationFrame(detectFaces);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEyeMovement = (face: faceDetection.Face) => {
    if (videoRef.current) {
      //   const { x, y } = videoRef.current.getBoundingClientRect();
      const leftEye = face.keypoints.find((keypoint) => keypoint.name === "leftEye");
      const rightEye = face.keypoints.find((keypoint) => keypoint.name === "rightEye");
      if (leftEye && rightEye) {
        const centerX = DELTA_X - (leftEye.x + rightEye.x) / 2;
        const centerY = (leftEye.y + rightEye.y) / 2;
        const ratioX = (centerX - face.box.xMin) / face.box.width;
        const ratioY = (centerY - face.box.yMin) / face.box.height;
        const minY = 0.2;
        const maxY = 0.4;
        const scaledY = (ratioY - minY) / (maxY - minY);
        const clampedY = Math.max(0, Math.min(1, scaledY));
        const [posX, posY] = [document.documentElement.clientWidth * ratioX, document.documentElement.clientHeight * clampedY];
        if (ratioX > 0 && ratioY > 0 && ratioX <= 1 && clampedY <= 1) setCoordinates({ x: posX, y: posY });
      }
    }
  };

  const toggleDetector = () => {
    startRef.current = !startRef.current;
    if (startRef.current) {
      startModel();
    }
  };

  useEffect(() => {
    const getVideoStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {},
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing the webcam", error);
      }
    };

    getVideoStream();
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (timer === 0) {
      toggleDetector();
      clearInterval(timerRef.current);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.fillStyle = darkThemeMq.matches ? "#000" : "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [timer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.ceil(coordinates.x) - 50;
        const y = Math.ceil(coordinates.y) - 100;
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }, [coordinates.x, coordinates.y]);

  return (
    <>
      <h1 className="absolute top-0 text-center text-xl">Unveil the Surprise as You Burn the Canvas with Your Gaze</h1>
      <div className="w-full min-h-screen flex items-center justify-center bg-white dark:bg-black">
        {timer !== 0 && <div className="flex flex-col items-center bottom-0">Starting in {timer}</div>}
        {timer === 0 && <Tracker clientX={coordinates.x} clientY={coordinates.y} color="bg-red-500" />}
      </div>
      <div ref={revealRef} className="flex items-center justify-center w-full h-full absolute">
        <video className={`absolute ${timer === 0 ? "z-[10]" : "z-[-10]"}`} ref={videoRef} autoPlay width={640} height={480} muted />
        {timer === 0 && <canvas className="z-[10]" ref={canvasRef} width={640} height={480} />}
      </div>
    </>
  );
}
