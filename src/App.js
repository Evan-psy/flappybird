import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import backgroundImage from "./Images/bgdia.png";
import baseImage from "./Images/basex5.jpg";
import birdImage from "./Images/pajaroaletabaja.png";
import birdFlyingImage from "./Images/pajaroaletaalta.png";
import tubeImage from "./Images/botpipe.png";
import ding from "./audio/point.ogg";
import hitSound from "./audio/hit.wav";
import Flap from "./audio/wing.ogg";
import "./fonts.css";

// Constants for game parameters
const gravity = -0.1;
const tubeWidth = 82;
const tubeHeight = 320;
const tubeGap = 1000;
const tubeSpeed = 3;

// Function to generate random tube position
const generateRandomTubePosition = () => {
  const minY = window.innerHeight * -0.01;
  const maxY = window.innerHeight * -0.15;
  const randomY = Math.random() * (maxY - minY) + minY;
  return { x: window.innerWidth, yUpper: randomY, yLower: randomY - 10 };
};

// Component for rendering tubes
const Tube = ({ tube, index }) => (
  <div
    className="tube"
    style={{ position: "absolute", left: tube.x, bottom: 0 }}
  >
    <img
      className={`tube-upper tube-upper-${index}`}
      src={tubeImage}
      alt="Tube"
      style={{
        width: tubeWidth,
        height: tubeHeight,
        bottom: window.innerHeight - tube.yUpper - tubeHeight,
      }}
    />
    <img
      className={`tube-lower tube-lower-${index}`}
      src={tubeImage}
      alt="Tube"
      style={{
        width: tubeWidth,
        height: tubeHeight,
        bottom: tube.yLower,
        zIndex: 0,
      }}
    />
  </div>
);

// Main App component
function App() {
  // State variables
  const hitAudioRef = useRef(null);
  const dingAudioRef = useRef(null);
  const [basePosition, setBasePosition] = useState(0);
  const [birdPosition, setBirdPosition] = useState(window.innerHeight / 2);
  const [birdVelocity, setBirdVelocity] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highestScore, setHighestScore] = useState(() => {
    const savedHighestScore = localStorage.getItem("highestScore");
    return savedHighestScore ? parseInt(savedHighestScore) : 0;
  });
  const [tubes, setTubes] = useState([]);
  const [isFlying, setIsFlying] = useState(false); // New state to control bird flying animation
  const [flapSprite, setFlapSprite] = useState(true); // true para aleta alta, false para aleta baja

  // Refs
  const baseRef = useRef(null);
  const animateRef = useRef(null);
  const flapAudioRef = useRef(null);

  // Function to handle bird jump
  const handleJump = () => {
    if (!gameOver) {
      playAudio(flapAudioRef); // Reproduce el sonido "flap"
      setIsFlying(true); // Set isFlying state to true to animate bird flying
      setBirdVelocity(4); // Set bird velocity to make it jump
      setTimeout(() => setIsFlying(false), 200); // After a short delay, set isFlying state to false
    }
  };

  // Event handlers
  const handleKeyDown = useCallback(
    (e) => {
      if (!gameStarted && e.keyCode === 32) {
        setGameStarted(true);
        playAudio(dingAudioRef); // Using playAudio function
      } else if (gameStarted && !gamePaused && e.keyCode === 32) {
        handleJump(); // Call handleJump function when spacebar is pressed
      } else if (
        (e.keyCode === 80 || e.keyCode === 27 || e.keyCode === 32) &&
        gameStarted &&
        !gameOver
      ) {
        setGamePaused((prevPaused) => !prevPaused);
      }
    },
    [gameStarted, gamePaused, gameOver, handleJump]
  );

  const handleKeyPress = useCallback(
    (e) => {
      if (e.keyCode === 32 && gameOver) {
        restartGame();
      }
    },
    [gameOver]
  );

  const handleScreenClick = useCallback(() => {
    if (!gameStarted) {
      setGameStarted(true);
      playAudio(dingAudioRef); // Using playAudio function
    } else if (!gamePaused && !gameOver) {
      handleJump(); // Call handleJump function when screen is clicked
    } else if (gameOver) {
      restartGame(); // Restart the game when screen is clicked after game over
    }
  }, [gameStarted, gamePaused, gameOver, handleJump]);

  // Effects
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  useEffect(() => {
    document.addEventListener("click", handleScreenClick);
    return () => {
      document.removeEventListener("click", handleScreenClick);
    };
  }, [handleScreenClick]);

  useEffect(() => {
    if (score > highestScore) {
      setHighestScore(score);
      playAudio(dingAudioRef);
      localStorage.setItem("highestScore", score);
    }
  }, [score, highestScore]);

  // Agrega un efecto para alternar entre los sprites con un intervalo de tiempo
  useEffect(() => {
    const flapInterval = setInterval(() => {
      setFlapSprite((prevFlapSprite) => !prevFlapSprite);
    }, 150); // Intervalo de 200 milisegundos entre cambios de sprite

    return () => clearInterval(flapInterval); // Limpia el intervalo cuando el componente se desmonta
  }, []);

  useEffect(() => {
    const detectBaseCollision = () => {
      const birdRect = document.querySelector(".bird").getBoundingClientRect();
      const baseRect = baseRef.current.getBoundingClientRect();
      if (birdRect.bottom >= baseRect.top) {
        setGameOver(true);
        cancelAnimationFrame(animateRef.current);

        if (hitAudioRef.current) {
          playAudio(hitAudioRef); // Play hit sound on collision with base
        }
      }

      // Check collision with tubes
      tubes.forEach((tube, index) => {
        const upperTubeRect = document
          .querySelector(`.tube-upper-${index}`)
          .getBoundingClientRect();
        const lowerTubeRect = document
          .querySelector(`.tube-lower-${index}`)
          .getBoundingClientRect();
        if (
          birdRect.right > tube.x &&
          birdRect.left < tube.x + tubeWidth &&
          (birdRect.top < upperTubeRect.bottom ||
            birdRect.bottom > lowerTubeRect.top)
        ) {
          setGameOver(true);
          cancelAnimationFrame(animateRef.current);

          if (hitAudioRef.current) {
            playAudio(hitAudioRef); // Play hit sound on collision with tubes
          }
        }
      });
    };

    const animate = () => {
      setBirdVelocity((prevVelocity) => prevVelocity <= -1.5 ? prevVelocity : prevVelocity + gravity);
      setBirdPosition((prevPosition) => prevPosition + birdVelocity);
      setBasePosition((prevPosition) => (prevPosition + tubeSpeed -1) % window.innerWidth);

      setTubes((prevTubes) => {
        let incrementScore = false;
        const newTubes = prevTubes
          .map((tube) => {
            const newX = tube.x - tubeSpeed;
            if (newX < 100 && tube.x >= 100) {
              incrementScore = true;
              playAudio(dingAudioRef);
            }
            return { ...tube, x: newX };
          })
          .filter((tube) => tube.x > -tubeWidth);

        if (incrementScore) {
          setScore((prevScore) => prevScore + 1);
          playAudio(dingAudioRef);
        }

        if (
          newTubes.length === 0 ||
          window.innerWidth - newTubes[newTubes.length - 1].x >= tubeGap
        ) {
          newTubes.push(generateRandomTubePosition());
        }

        return newTubes;
      });

      detectBaseCollision();

      const birdRect = document.querySelector(".bird").getBoundingClientRect();
      tubes.forEach((tube, index) => {
        const upperTubeRect = document
          .querySelector(`.tube-upper-${index}`)
          .getBoundingClientRect();
        const lowerTubeRect = document
          .querySelector(`.tube-lower-${index}`)
          .getBoundingClientRect();
        if (
          birdRect.right > tube.x &&
          birdRect.left < tube.x + tubeWidth &&
          (birdRect.top < upperTubeRect.bottom ||
            birdRect.bottom > lowerTubeRect.top)
        ) {
          setGameOver(true);
          cancelAnimationFrame(animateRef.current);
        }
      });

      const baseHeight = 50;
      const birdBottomPosition = birdPosition + 50 - 1; // Assuming bird height as 50
      if (birdBottomPosition >= window.innerHeight - baseHeight) {
        setGameOver(true);
        cancelAnimationFrame(animateRef.current);
      }

      animateRef.current = requestAnimationFrame(animate);
    };

    if (gameStarted && !gamePaused && !gameOver) {
      animateRef.current = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(animateRef.current);
    };
  }, [gameStarted, gamePaused, birdVelocity, tubes, gameOver, birdPosition]);

  // Restart the game
  const restartGame = () => {
    setBasePosition(0);
    setBirdPosition(window.innerHeight / 2);
    setBirdVelocity(0);
    setGameStarted(false);
    setGamePaused(false);
    setGameOver(false);
    setScore(0);
    setTubes([]);
  };

  const playAudio = (audioElementRef) => {
    if (audioElementRef && audioElementRef.current) {
      audioElementRef.current.play().catch((error) => {
        console.error("Error playing sound:", error);
      });
    }
  };

  // Render JSX
  return (
    <div className="App" onClick={handleScreenClick}>
      {/* Overlay for pause and game over */}
      <div
        className={`overlay ${gamePaused || gameOver ? "overlay-dark" : ""}`}
        style={{ display: gamePaused ? "block" : "none" }}
      />
      {gamePaused || gameOver ? (
        <div
          className="overlay"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 9,
          }}
        />
      ) : null}
      <div
        className="overlay"
        style={{ display: gamePaused ? "block" : "none" }}
      />
      {/* Background */}
      <img src={backgroundImage} alt="Background" className="background" />
      {/* Tubes */}
      {tubes.map((tube, index) => (
        <Tube key={index} tube={tube} index={index} />
      ))}
      {/* Score display */}
      <div className="score-display">
        <h1>{score}</h1>
      </div>
      {/* Base container */}
      <div className="base-container">
        <img
          src={baseImage}
          alt="Base"
          className="base"
          style={{ left: `${basePosition}px`, bottom: "0", zIndex: 1 }}
          ref={baseRef}
        />
        <img
          src={baseImage}
          alt="Base"
          className="base"
          style={{ left: `${((basePosition - window.innerWidth+46) / window.innerWidth) * 100}%` }}
        />
      </div>
      {/* Pause message */}
      {gamePaused && (
        <div className="pause-message">
          <h1>PAUSED</h1>
          <h2>PRESS ESC OR SPACE TO CONTINUE</h2>
        </div>
      )}
      {/* Bird */}
      {gameStarted && !gameOver && (
        <img
          src={flapSprite ? birdFlyingImage : birdImage}
          alt="Bird"
          className={`bird ${birdVelocity < 0 ? "bird-down" : "bird-up"}`} // Aplicar clase según la velocidad vertical
          style={{ left: "100px", bottom: `${birdPosition}px` }}
        />
      )}

      {/* Game over message */}
      {gameOver && (
        <div className="pause-message">
          <h1>GAME OVER</h1>
          <h1>HIGHEST SCORE: {highestScore}</h1>
          <h1>PRESS SPACE TO RESTART</h1>
        </div>
      )}
      {/* Start message */}
      {!gameStarted && !gameOver && (
        <div className="start-message">
          <h1>FLAPPY BIRD</h1>
          <div className="bird-container">
            <img
              src={flapSprite ? birdFlyingImage : birdImage}
              alt="Bird"
              className="start-bird"
              style={{ left: "100px", bottom: `${birdPosition}px` }}
            />{" "}
          </div>
          <h1>PRESS SPACE TO START</h1>
        </div>
      )}
      {/* Audio */}
      <audio ref={dingAudioRef} src={ding} preload="auto" />
      <audio ref={hitAudioRef} src={hitSound} preload="auto" />
      <audio ref={flapAudioRef} src={Flap} preload="auto" />
    </div>
  );
}

export default App;
