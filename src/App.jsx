import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Donate from "./pages/Donate";
import Confirm from "./pages/Confirm";
import ThankYou from "./pages/ThankYou";
import About from "./pages/About";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/donate" element={<Donate />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </>
  );
}

export default App;
