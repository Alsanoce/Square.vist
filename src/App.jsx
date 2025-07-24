import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import home from "./pages/home";
import donate from "./pages/donate";
import Confirm from "./pages/OtpConfirmationPage";
import ThankYou from "./pages/ThankYou";
import about from "./pages/about";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<home />} />
        <Route path="/donate" element={<donate />} />
        <Route path="/OtpConfirmationPage.jsx" element={<OtpConfirmationPage />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/about" element={<about />} />
      </Routes>
    </>
  );
}

export default App;
