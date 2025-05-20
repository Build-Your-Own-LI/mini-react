import miniReact from "./miniReact";

// Ensure miniReact.useState and miniReact.useEffect are available
const { useState, useEffect } = miniReact;

function EffectLoggerComponent() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("EffectLoggerComponent mounted");
    return () => {
      console.log("EffectLoggerComponent unmounted");
    };
  }, []); // Runs once on mount and cleanup on unmount

  useEffect(() => {
    console.log(`EffectLoggerComponent count is: ${count}`);
    return () => {
      console.log(`EffectLoggerComponent cleanup for count: ${count}`);
    };
  }, [count]); // Runs on mount and when count changes

  return (
    <div>
      <h2>Effect Logger Component</h2>
      <p>Count: {count}</p>
      <button type="button" onClick={() => setCount(prev => prev + 1)}>
        Increment Count
      </button>
    </div>
  );
}

function App() {
  const [showLogger, setShowLogger] = useState(true);

  return (
    <div>
      <h1>miniReact useEffect Test</h1>
      <button type="button" onClick={() => setShowLogger(prev => !prev)}>
        Toggle Logger Component
      </button>
      {showLogger && <EffectLoggerComponent />}
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  miniReact.render(<App />, container);
} else {
  console.error("Root container not found");
}
