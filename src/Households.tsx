import {
  House,
  UsersRound,
  Users,
  ArrowLeft,
} from "lucide-react";

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

  // =========================
  // TOTAL FAMILIES
  // =========================

  const totalFamilies = safeRecords.reduce(
    (total: number, record: any) => {
      const families = Array.isArray(record?.families)
        ? record.families
        : [];

      return total + families.length;
    },
    0
  );

  // =========================
  // TOTAL RESIDENTS
  // =========================

  const totalResidents = safeRecords.reduce(
    (total: number, record: any) => {
      const families = Array.isArray(record?.families)
        ? record.families
        : [];

      return (
        total +
        families.reduce(
          (
            familyTotal: number,
            family: any
          ) => {
            const members = Array.isArray(
              family?.members
            )
              ? family.members
              : [];

            return familyTotal + members.length;
          },
          0
        )
      );
    },
    0
  );

  return (
    <main
      style={{
        flex: 1,
        padding: "34px 42px",
        background: "#f5f7fb",
        minHeight: "100vh",
      }}
    >

      {/* =========================
          HEADER
      ========================= */}

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
          <ArrowLeft
            size={17}
            strokeWidth={1.8}
          />

          Back to Dashboard
        </button>

      </div>


      {/* =========================
          HOUSEHOLD SUMMARY
      ========================= */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3, minmax(0, 1fr))",
          gap: "18px",
          marginBottom: "22px",
        }}
      >

        {/* TOTAL HOUSEHOLDS */}

        <div
          style={{
            background: "white",
            border: "1px solid #e7eaf0",
            borderRadius: "14px",
            padding: "24px",
          }}
        >

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              marginBottom: "12px",
            }}
          >

            <House
              size={20}
              strokeWidth={1.8}
            />

            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#7e8a9f",
              }}
            >
              TOTAL HOUSEHOLDS
            </span>

          </div>

          <strong
            style={{
              fontSize: "28px",
              color: "#172033",
            }}
          >
            {safeRecords.length}
          </strong>

        </div>


        {/* TOTAL FAMILIES */}

        <div
          style={{
            background: "white",
            border: "1px solid #e7eaf0",
            borderRadius: "14px",
            padding: "24px",
          }}
        >

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              marginBottom: "12px",
            }}
          >

            <UsersRound
              size={20}
              strokeWidth={1.8}
            />

            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#7e8a9f",
              }}
            >
              TOTAL FAMILIES
            </span>

          </div>

          <strong
            style={{
              fontSize: "28px",
              color: "#172033",
            }}
          >
            {totalFamilies}
          </strong>

        </div>


        {/* TOTAL RESIDENTS */}

        <div
          style={{
            background: "white",
            border: "1px solid #e7eaf0",
            borderRadius: "14px",
            padding: "24px",
          }}
        >

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              marginBottom: "12px",
            }}
          >

            <Users
              size={20}
              strokeWidth={1.8}
            />

            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#7e8a9f",
              }}
            >
              TOTAL RESIDENTS
            </span>

          </div>

          <strong
            style={{
              fontSize: "28px",
              color: "#172033",
            }}
          >
            {totalResidents}
          </strong>

        </div>

      </div>


      {/* =========================
          TOTAL HOUSEHOLDS LABEL
      ========================= */}

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


      {/* =========================
          HOUSEHOLD RECORDS
      ========================= */}

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
            (
              record: any,
              index: number
            ) => {

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
                      total +
                      members.length
                    );
                  },
                  0
                );

              return (

                <div
                  key={`${record?.householdNumber || "household"}-${index}`}
                  style={{
                    background: "white",
                    border: "1px solid #e7eaf0",
                    borderRadius: "14px",
                    padding: "22px",
                  }}
                >

                  {/* CARD HEADER */}

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
                      }}
                    >

                      <House
                        size={22}
                        strokeWidth={1.8}
                      />

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


                  {/* HOUSEHOLD INFORMATION */}

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


                  {/* FAMILY / RESIDENT TOTAL */}

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

                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >

                      <UsersRound
                        size={16}
                        strokeWidth={1.8}
                      />

                      <strong>
                        {families.length}
                      </strong>{" "}
                      Family
                      {families.length !== 1
                        ? "ies"
                        : ""}

                    </span>


                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >

                      <Users
                        size={16}
                        strokeWidth={1.8}
                      />

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