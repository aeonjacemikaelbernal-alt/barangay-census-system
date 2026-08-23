import { WalletCards, ArrowLeft } from "lucide-react";

type IncomeProps = {
  censusRecords: any[];
  onBackToDashboard: () => void;
};

function Income({
  censusRecords,
  onBackToDashboard,
}: IncomeProps) {
  return (
    <main
      style={{
        flex: 1,
        padding: "34px 42px",
        background: "#f5f7fb",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 7px",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.13em",
              color: "#7e8a9f",
            }}
          >
            BARANGAY MANAGEMENT SYSTEM
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              color: "#172033",
            }}
          >
            Income
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#758094",
              fontSize: "14px",
            }}
          >
            View household and resident income information.
          </p>
        </div>

        <button
  type="button"
  onClick={onBackToDashboard}
  style={{
    border: "1px solid #dfe4eb",
    background: "white",
    borderRadius: "10px",
    padding: "11px 18px",
    cursor: "pointer",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }}
>
  <ArrowLeft size={16} strokeWidth={1.8} />
  Back to Dashboard
</button>
      </div>

      <div
        style={{
          background: "white",
          border: "1px solid #e7eaf0",
          borderRadius: "14px",
          padding: "30px",
        }}
      >
        <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "9px",
  }}
>
  <WalletCards
    size={20}
    strokeWidth={1.8}
  />

  <h2 style={{ margin: 0 }}>
    Income Records
  </h2>
</div>

        <p>
          Total census records:{" "}
          <strong>{censusRecords.length}</strong>
        </p>
      </div>
    </main>
  );
}

export default Income;