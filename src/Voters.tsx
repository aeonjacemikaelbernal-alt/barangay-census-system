import { Vote, ArrowLeft } from "lucide-react";

type VotersProps = {
  censusRecords: any[];
  onBackToDashboard: () => void;
};

function Voters({
  censusRecords,
  onBackToDashboard,
}: VotersProps) {
  return (
    <main className="dashboard-main">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-overline">
            DATA CATEGORY
          </p>

          <h1>Voters</h1>

          <p className="dashboard-description">
            View voter registration information.
          </p>
        </div>

      <button
  type="button"
  className="new-census-button"
  onClick={onBackToDashboard}
  style={{
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }}
>
  <ArrowLeft size={16} strokeWidth={1.8} />
  Back to Dashboard
</button>
      </header>

      <section className="dashboard-section">
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "9px",
  }}
>
  <Vote size={20} strokeWidth={1.8} />

  <h2 style={{ margin: 0 }}>
    Voter Records
  </h2>
</div>
        <p>
          Total census records: {censusRecords.length}
        </p>
      </section>
    </main>
  );
}

export default Voters;