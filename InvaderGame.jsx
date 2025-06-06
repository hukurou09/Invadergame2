import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────
// 🚀  InvaderGame – a compact Space‑Invaders‑style mini‑game
// ─────────────────────────────────────────────────────────────
// • Built for quick drop‑in on any Windsurf project
// • TailwindCSS for styling ▸ no extra CSS file needed
// • Framer‑motion adds glossy UI transitions
// • Uses plain Canvas2D under the hood – performs great
// ─────────────────────────────────────────────────────────────

export default function InvaderGame() {
  // ───────────── Background Image State ─────────────
  const [bgImage, setBgImage] = useState(null);
  // ───────────── State & refs ─────────────
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [width, height] = [480, 640];

  // ─────────── game objects ───────────
  const player = useRef({ x: width / 2 - 20, y: height - 40, w: 40, h: 20 });
  const bullets = useRef([]); // each ▸ {x, y, r}
  const aliens = useRef([]);  // grid of invaders
  const alienDir = useRef(1); // 1 ▸ right, -1 ▸ left
  const lastFire = useRef(0);
  const keysPressed = useRef({ ArrowLeft: false, ArrowRight: false }); // To track key states

  // initialize aliens once
  useEffect(() => {
    const rows = 4;
    const cols = 8;
    const padding = 10;
    const startX = 40;
    const startY = 60;
    const aW = 30;
    const aH = 20;
    aliens.current = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        aliens.current.push({
          x: startX + c * (aW + padding),
          y: startY + r * (aH + padding),
          w: aW,
          h: aH,
        });
      }
    }
  }, []);

  // Load background image once
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setBgImage(img);
    };
    img.onerror = () => {
      console.error("Failed to load background image from /background_space.jpg");
    };
    img.src = "/background_space.jpg"; // Assumes image is in public folder
  }, []);

  // ────────────── Controls ──────────────
  useEffect(() => {
    function handleKeyDown(e) {
      // Movement keys only affect if isPlaying
      if (e.key === "ArrowLeft" && isPlaying) keysPressed.current.ArrowLeft = true;
      if (e.key === "ArrowRight" && isPlaying) keysPressed.current.ArrowRight = true;
      
      if (e.key === " " && isPlaying) { // Fire only if playing
        const now = Date.now();
        if (now - lastFire.current > 250) { // 250ms cooldown
          bullets.current.push({ 
            x: player.current.x + player.current.w / 2, // Bullet X centered on player
            y: player.current.y, 
            r: 4 
          });
          lastFire.current = now;
        }
      }
    }

    function handleKeyUp(e) {
      if (e.key === "ArrowLeft") keysPressed.current.ArrowLeft = false;
      if (e.key === "ArrowRight") keysPressed.current.ArrowRight = false;
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      // Reset keysPressed on cleanup to prevent movement after game ends and restarts
      keysPressed.current.ArrowLeft = false;
      keysPressed.current.ArrowRight = false;
    };
  }, [isPlaying]); // Re-run if isPlaying changes

  // ─────────────── Game loop ───────────────
  useEffect(() => {
    let animId;
    const ctx = canvasRef.current?.getContext("2d");

    function collide(a, b) {
      return (
        a.x < b.x + b.w &&
        a.x + (a.w || a.r * 2) > b.x &&
        a.y < b.y + b.h &&
        a.y + (a.h || a.r * 2) > b.y
      );
    }

    function step() {
      if (!ctx) return;
      // ctx.clearRect(0, 0, width, height); // Clearing is now handled by drawing the background

      // Draw background
      if (bgImage) {
        ctx.drawImage(bgImage, 0, 0, width, height);
      } else {
        // Fallback background color if image hasn't loaded or failed
        ctx.fillStyle = "#0f172a"; // slate-900 (original canvas background)
        ctx.fillRect(0, 0, width, height);
      }

      // Player movement based on pressed keys
      if (isPlaying) { // Only move if game is active
        const playerSpeed = 5; // Adjust for desired speed
        if (keysPressed.current.ArrowLeft && player.current.x > 0) {
          player.current.x -= playerSpeed;
        }
        if (keysPressed.current.ArrowRight && player.current.x < width - player.current.w) {
          player.current.x += playerSpeed;
        }
      }

      // Move aliens
      let moveDown = false;
      aliens.current.forEach(al => {
        al.x += alienDir.current * 1.2;
      });
      const leftMost = Math.min(...aliens.current.map(a => a.x));
      const rightMost = Math.max(...aliens.current.map(a => a.x + a.w));
      if (leftMost < 0 || rightMost > width) {
        alienDir.current *= -1;
        moveDown = true;
      }
      if (moveDown) aliens.current.forEach(al => (al.y += 20));

      // Move & draw bullets
      bullets.current.forEach(b => (b.y -= 6));
      bullets.current = bullets.current.filter(b => b.y > -10);

      // Bullet ‑ Alien collisions
      bullets.current.forEach((b, bi) => {
        aliens.current.forEach((a, ai) => {
          if (collide({ x: b.x - b.r, y: b.y - b.r, r: b.r }, a)) {
            aliens.current.splice(ai, 1);
            bullets.current.splice(bi, 1);
            setScore(s => s + 10);
          }
        });
      });

      // Alien ‑ Player collisions / reach bottom
      aliens.current.forEach(a => {
        if (collide(a, { ...player.current })) {
          setLives(l => l - 1);
          a.y = height + 100; // remove
        }
        if (a.y + a.h >= height) {
          setLives(l => 0);
        }
      });
      aliens.current = aliens.current.filter(a => a.y < height);

      // Draw aliens
      ctx.fillStyle = "#34d399"; // emerald‑400
      aliens.current.forEach(a => ctx.fillRect(a.x, a.y, a.w, a.h));

      // Draw bullets
      ctx.fillStyle = "#fbbf24"; // amber‑400
      bullets.current.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw player
      ctx.fillStyle = "#60a5fa"; // blue‑400
      ctx.fillRect(player.current.x, player.current.y, player.current.w, player.current.h);

      // UI overlay
      ctx.fillStyle = "white";
      ctx.font = "14px sans-serif";
      ctx.fillText(`Score: ${score}`, 10, 20);
      ctx.fillText(`Lives: ${lives}`, width - 80, 20);

      if (lives > 0 && aliens.current.length > 0) {
        animId = requestAnimationFrame(step);
      } else {
        setIsPlaying(false);
      }
    }

    if (isPlaying) animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, score, lives]);

  // reset & start game
  function startGame() {
    // reset state
    setScore(0);
    setLives(3);
    player.current.x = width / 2 - 20;
    bullets.current = [];
    alienDir.current = 1;
    // rebuild alien grid
    const rows = 4;
    const cols = 8;
    const padding = 10;
    const startX = 40;
    const startY = 60;
    const aW = 30;
    const aH = 20;
    aliens.current = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        aliens.current.push({
          x: startX + c * (aW + padding),
          y: startY + r * (aH + padding),
          w: aW,
          h: aH,
        });
      }
    }
    setIsPlaying(true);
  }

  // ─────────── Render ────────────
  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-2xl shadow-lg border border-slate-700"
      />

      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute flex flex-col items-center gap-4 bg-black/60 p-6 rounded-xl"
          >
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">
              {lives === 0 || aliens.current.length === 0 ? "Game Over" : "Space Invader"}
            </h1>
            {lives === 0 || aliens.current.length === 0 ? (
              <p className="text-white">Your score: {score}</p>
            ) : (
              <p className="text-white text-center max-w-xs">
                Move with ◂ ▸ Shoot with SPACE<br />
                Destroy all invaders before they reach you.
              </p>
            )}
            <button
              onClick={startGame}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-full font-semibold shadow-md"
            >
              {lives === 0 || aliens.current.length === 0 ? "Play Again" : "Start"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
