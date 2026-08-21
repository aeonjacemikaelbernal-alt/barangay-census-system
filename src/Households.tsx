type HouseholdsProps = {
  censusRecords: any[];
  onBackToDashboard: () => void;
};

function Households({
  censusRecords,
  onBackToDashboard,
}: HouseholdsProps) {

  const safeRecords = Array.isArray(censusRecords)
    ? censusRecords.filter(Boolean)
    : [];

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
            Households
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#758094",
              fontSize: "14px",
            }}
          >
            View all registered household census records.
          </p>
        </div>

        <button
          onClick={onBackToDashboard}
          style={{
            border: "1px solid #dfe4eb",
            background: "white",
            borderRadius: "10px",
            padding: "11px 18px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ← Back to Dashboard
        </button>

      </div>

      <div
        style={{
          marginBottom: "20px",
          color: "#758094",
          fontSize: "14px",
        }}
      >
        Total households:{" "}
        <strong>
          {safeRecords.length}
        </strong>
      </div>

      {safeRecords.length === 0 ? (

        <div
          style={{
            background: "white",
            border: "1px solid #e7eaf0",
            borderRadius: "14px",
            padding: "50px",
            textAlign: "center",
          }}
        >
          <h3>
            No household records yet
          </h3>

          <p>
            Start by adding a household census record.
          </p>

        </div>

      ) : (

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "16px",
          }}
        >

          {safeRecords.map(
            (record: any, index: number) => {

              const household =
                record?.household || {};

              const families =
                Array.isArray(record?.families)
                  ? record.families
                  : [];

              const residents =
                families.reduce(
                  (
                    total: number,
                    family: any
                  ) => {

                    const members =
                      Array.isArray(
                        family?.members
                      )
                        ? family.members
                        : [];

                    return (
                      total + members.length
                    );
                  },
                  0
                );

              return (

                <div
                  key={
                    record?.householdNumber ||
                    index
                  }
                  style={{
                    background: "white",
                    border: "1px solid #e7eaf0",
                    borderRadius: "14px",
                    padding: "22px",
                  }}
                >

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "20px",
                    }}
                  >

                    <div
                      style={{
                        width: "45px",
                        height: "45px",
                        borderRadius: "11px",
                        background: "#f0f4f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "21px",
                      }}
                    >
                      🏠
                    </div>

                    <div>

                      <h3
                        style={{
                          margin: 0,
                          fontSize: "17px",
                        }}
                      >
                        {record?.householdNumber ||
                          "HOUSEHOLD"}
                      </h3>

                      <span
                        style={{
                          color: "#8993a5",
                          fontSize: "12px",
                        }}
                      >
                        Household Record
                      </span>

                    </div>

                  </div>

                  <div
                    style={{
                      borderTop:
                        "1px solid #eef0f4",
                      paddingTop: "16px",
                    }}
                  >

                    <p>
                      <strong>
                        House No.:
                      </strong>{" "}
                      {household?.houseNumber ||
                        "—"}
                    </p>

                    <p>
                      <strong>
                        Street:
                      </strong>{" "}
                      {household?.street ||
                        "—"}
                    </p>

                    <p>
                      <strong>
                        Purok:
                      </strong>{" "}
                      {household?.purok ||
                        "—"}
                    </p>

                    <p>
                      <strong>
                        Years in Barangay:
                      </strong>{" "}
                      {household?.yearsInBarangay ||
                        "—"}
                    </p>

                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "20px",
                      marginTop: "20px",
                      paddingTop: "16px",
                      borderTop:
                        "1px solid #eef0f4",
                    }}
                  >

                    <span>
                      👨‍👩‍👧{" "}
                      <strong>
                        {families.length}
                      </strong>{" "}
                      Family
                      {families.length !== 1
                        ? "ies"
                        : ""}
                    </span>

                    <span>
                      👥{" "}
                      <strong>
                        {residents}
                      </strong>{" "}
                      Resident
                      {residents !== 1
                        ? "s"
                        : ""}
                    </span>

                  </div>

                </div>

              );
            }
          )}

        </div>

      )}

    </main>
  );
}

export default Households;