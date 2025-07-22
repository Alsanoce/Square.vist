import { Routes, Route } from "react-router-dom";
import DonateForm from "./pages/Donate";
import OtpConfirmationPage from "./pages/OtpConfirmationPage";
import ThankYou from "./pages/ThankYou"; // ← تم إضافته

function App() {
  return (
    <Routes>
      <Route path="/" element={<DonateForm />} />
      <Route path="/confirm" element={<OtpConfirmationPage />} />
      <Route path="/thank-you" element={<ThankYou />} />
    </Routes>
  );
}

export default App;