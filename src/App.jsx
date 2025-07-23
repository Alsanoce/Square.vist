import { useState } from "react";
import { Home, Donate, Mosques, History, Profile } from "./pages";

function App() {
  const [tab, setTab] = useState("home");

  const renderPage = () => {
    switch (tab) {
      case "donate": return <Donate />;
      case "mosques": return <Mosques />;
      case "history": return <History />;
      case "profile": return <Profile />;
      default: return <Home />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-green-600 text-white text-center py-4 text-xl font-bold shadow">
        سقيا الخير
      </header>

      <main className="flex-1 overflow-auto p-4">
        {renderPage()}
      </main>

      <nav className="bg-white shadow border-t flex justify-around py-2">
        {[
          { key: "home", label: "الرئيسية" },
          { key: "donate", label: "تبرع" },
          { key: "mosques", label: "المساجد" },
          { key: "history", label: "تاريخي" },
          { key: "profile", label: "حسابي" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 text-sm ${tab === key ? "text-green-600 font-bold" : "text-gray-500"}`}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
