import { Routes, Route } from "react-router-dom";
import "./styles/global.css";

import Navbar               from "./components/Navbar";
import Home                 from "./pages/home";
import Donate               from "./pages/donate";
import OtpConfirmationPage  from "./pages/OtpConfirmationPage";
import { ThankYou, About }  from "./pages/ThankYouAndAbout";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"          element={<Home />}                />
        <Route path="/donate"    element={<Donate />}             />
        <Route path="/confirm"   element={<OtpConfirmationPage />} />
        <Route path="/thank-you" element={<ThankYou />}           />
        <Route path="/about"     element={<About />}              />
      </Routes>
    </>
  );
}

export default App;
