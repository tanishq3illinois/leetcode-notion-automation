import React, { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api")
      .then((res) => res.json())
      .then((data) => setData(data));
  }, []);

  return <div></div>;
}

export default App;
