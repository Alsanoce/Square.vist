import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import home from "./pages/home";
import Donate from "./pages/Donate";
import Confirm from "./pages/OtpConfirmationPage";
import ThankYou from "./pages/ThankYou";
import About from "./pages/About";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<home />} />
        <Route path="/donate" element={<Donate />} />
        <Route path="/OtpConfirmationPage.jsx" element={<OtpConfirmationPage />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </>
  );
}

export default App;
