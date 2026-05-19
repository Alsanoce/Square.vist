import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase";

const BANK_DETAILS = {
  bankName: "مصرف التجارة والتنمية",
  accountNumber: "0015247166001",
  accountHolder: "السنوسي سعد جمعة",
};

export default function BankTransfer() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const receiptPreview = useMemo(() => {
    if (!receiptFile) return "";
    return URL.createObjectURL(receiptFile);
  }, [receiptFile]);

  useEffect(() => {
    if (!state?.phone || !state?.mosque) navigate("/donate");
  }, [navigate, state]);

  useEffect(() => {
    return () => {
      if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    };
  }, [receiptPreview]);

  const handleReceiptChange = (event) => {
    const file = event.target.files?.[0];
    setMessage(null);

    if (!file) {
      setReceiptFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setReceiptFile(null);
      setMessage({ type: "error", text: "يرجى اختيار صورة إيصال بصيغة صورة." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setReceiptFile(null);
      setMessage({ type: "error", text: "حجم الصورة كبير. الحد الأقصى 5MB." });
      return;
    }

    setReceiptFile(file);
  };

  const uploadReceipt = async () => {
    const safeTransactionId = state.transactionId || `bank-${Date.now()}`;
    const extension = receiptFile.name.split(".").pop() || "jpg";
    const receiptRef = ref(storage, `bank-receipts/${safeTransactionId}.${extension}`);

    await uploadBytes(receiptRef, receiptFile, {
      contentType: receiptFile.type,
    });

    return getDownloadURL(receiptRef);
  };

  const saveRequest = async () => {
    if (isLoading) return;

    if (!receiptFile) {
      setMessage({ type: "error", text: "يرجى إضافة صورة إيصال التحويل قبل تسجيل الطلب." });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const receiptUrl = await uploadReceipt();

      await addDoc(collection(db, "payment_requests"), {
        transactionId: state.transactionId || "",
        donorName: state.donorName,
        phone: state.phone,
        whatsapp: state.whatsapp,
        amount: state.amount,
        quantity: state.quantity,
        unitPrice: state.unitPrice,
        mosque: state.mosque,
        mosqueAddress: state.mosqueAddress,
        mosqueLocation: state.mosqueLocation,
        paymentMethod: "تحويل مصرفي",
        bankName: BANK_DETAILS.bankName,
        bankAccountNumber: BANK_DETAILS.accountNumber,
        bankAccountHolder: BANK_DETAILS.accountHolder,
        receiptUrl,
        receiptFileName: receiptFile.name,
        status: "بانتظار مراجعة الإيصال",
        country: "ليبيا",
        timestamp: new Date(),
      });

      setMessage({
        type: "success",
        text: "تم استلام إيصال التحويل. سنراجع العملية ونتواصل معك على واتساب.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "تعذر تسجيل الإيصال. حاول مرة أخرى.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!state) return null;

  return (
    <div className="page-wrapper">
      <div className="section" style={s.wrapper}>
        <div style={s.header}>
          <span className="section-tag">الدفع</span>
          <h1 className="section-title">
            <span>تحويل مصرفي</span>
          </h1>
        </div>

        <div className="card" style={s.card}>
          <div style={s.bankHeader}>
            <div style={s.bankLogo}>CTD</div>
            <div>
              <strong style={s.bankName}>{BANK_DETAILS.bankName}</strong>
              <span style={s.bankCaption}>بيانات التحويل المصرفي</span>
            </div>
          </div>

          <div style={s.amountBox}>
            <span>قيمة الدفع</span>
            <strong>{state.amount} دينار</strong>
          </div>

          <div style={s.detailsBox}>
            <DetailRow label="رقم الحساب" value={BANK_DETAILS.accountNumber} dir="ltr" />
            <DetailRow label="صاحب الحساب" value={BANK_DETAILS.accountHolder} />
            <DetailRow label="المصرف" value={BANK_DETAILS.bankName} />
          </div>

          <label htmlFor="receipt-upload" style={s.uploadBox}>
            <input
              id="receipt-upload"
              type="file"
              accept="image/*"
              onChange={handleReceiptChange}
              style={s.fileInput}
            />
            {receiptPreview ? (
              <img src={receiptPreview} alt="إيصال التحويل" style={s.receiptPreview} />
            ) : (
              <span style={s.uploadText}>إضافة صورة الإيصال</span>
            )}
          </label>

          {receiptFile && <p style={s.fileName}>{receiptFile.name}</p>}

          <p style={s.note}>بعد التحويل، أضف صورة الإيصال ثم اضغط تسجيل الإيصال حتى نراجع العملية.</p>

          {message && (
            <div className={`alert ${message.type === "success" ? "alert-success" : "alert-danger"}`}>
              {message.text}
            </div>
          )}

          <button className="btn-primary" onClick={saveRequest} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner" /> جاري تسجيل الإيصال...
              </>
            ) : (
              "تسجيل إيصال التحويل"
            )}
          </button>

          <button type="button" onClick={() => navigate("/payment", { state })} style={s.backBtn}>
            العودة لاختيار طريقة الدفع
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, dir }) {
  return (
    <div style={s.detailRow}>
      <span>{label}</span>
      <strong dir={dir}>{value}</strong>
    </div>
  );
}

const s = {
  wrapper: { maxWidth: 540, margin: "0 auto" },
  header: { textAlign: "center", marginBottom: "2rem" },
  card: { padding: "2.2rem" },
  bankHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.9rem",
    marginBottom: "1.2rem",
  },
  bankLogo: {
    width: 62,
    height: 62,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "linear-gradient(135deg, #0b7f5b, #12b886)",
    color: "#fff",
    fontFamily: "'Cairo', sans-serif",
    fontSize: "1.15rem",
    fontWeight: 900,
    letterSpacing: 0,
  },
  bankName: {
    display: "block",
    color: "var(--white)",
    fontFamily: "'Cairo', sans-serif",
    fontSize: "1.05rem",
  },
  bankCaption: {
    display: "block",
    color: "var(--text-muted)",
    fontSize: "0.82rem",
    marginTop: "0.15rem",
  },
  amountBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    background: "rgba(0,212,255,0.06)",
    border: "1px solid rgba(0,212,255,0.15)",
    borderRadius: 14,
    color: "var(--text-muted)",
    padding: "1rem",
    marginBottom: "1rem",
  },
  detailsBox: {
    display: "grid",
    gap: "0.45rem",
    border: "1px solid rgba(0,212,255,0.15)",
    borderRadius: 14,
    padding: "1rem",
    marginBottom: "1.1rem",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    color: "var(--text-muted)",
    fontSize: "0.9rem",
  },
  uploadBox: {
    minHeight: 150,
    display: "grid",
    placeItems: "center",
    border: "1px dashed rgba(0,212,255,0.45)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    cursor: "pointer",
    overflow: "hidden",
    marginBottom: "0.6rem",
  },
  fileInput: { display: "none" },
  uploadText: {
    color: "var(--cyan)",
    fontWeight: 800,
  },
  receiptPreview: {
    width: "100%",
    maxHeight: 260,
    objectFit: "contain",
    background: "rgba(0,0,0,0.18)",
  },
  fileName: {
    color: "var(--success)",
    fontSize: "0.82rem",
    textAlign: "center",
    marginBottom: "0.8rem",
    wordBreak: "break-word",
  },
  note: {
    color: "var(--text-muted)",
    lineHeight: 1.9,
    marginBottom: "1rem",
    textAlign: "center",
  },
  backBtn: {
    display: "block",
    width: "100%",
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    fontFamily: "'Tajawal', sans-serif",
    fontSize: "0.9rem",
    cursor: "pointer",
    marginTop: "0.8rem",
    padding: "0.5rem",
  },
};
