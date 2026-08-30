import { WalletCards, ArrowLeft } from "lucide-react";

import type {
  CensusData,
  Family,
  Resident,
} from "../../types/census";

type IncomeProps = {
  censusRecords: CensusData[];
  onBackToDashboard: () => void;
};

function Income({
  censusRecords,
  onBackToDashboard,
}: IncomeProps) {

  // =========================
  // GET ALL FAMILY MEMBERS
  // =========================

  const safeRecords = Array.isArray(censusRecords)
    ? censusRecords.filter(Boolean)
    : [];

 const allFamilies: Family[] =
  safeRecords.flatMap(
    (record: CensusData) =>
      Array.isArray(record.families)
        ? record.families
        : []
  );

  const allMembers: Resident[] =
  allFamilies.flatMap(
    (family: Family) =>
      Array.isArray(family.members)
        ? family.members
        : []
  );

  // =========================
  // INCOME DATA
  // =========================

  const membersWithIncome = allMembers.filter(
    (member: Resident) => {
      const income = Number(member?.monthlyIncome);

      return (
        Number.isFinite(income) &&
        income > 0
      );
    }
  );

  const totalIncome = membersWithIncome.reduce(
    (total: number, member: Resident) => {
      return (
        total +
        Number(member?.monthlyIncome || 0)
      );
    },
    0
  );

  const averageIncome =
    membersWithIncome.length > 0
      ? totalIncome / membersWithIncome.length
      : 0;

  const highestIncome =
    membersWithIncome.length > 0
      ? Math.max(
          ...membersWithIncome.map(
            (member: Resident) =>
              Number(member?.monthlyIncome || 0)
          )
        )
      : 0;

  // =========================
  // INCOME RANGE
  // =========================

  const incomeRanges = [
    {
      label: "Below ₱10,000",
      count: membersWithIncome.filter(
        (member: Resident) =>
          Number(member?.monthlyIncome) < 10000
      ).length,
    },
    {
      label: "₱10,000 – ₱19,999",
      count: membersWithIncome.filter(
        (member: Resident) => {
          const income =
            Number(member?.monthlyIncome);

          return (
            income >= 10000 &&
            income < 20000
          );
        }
      ).length,
    },
    {
      label: "₱20,000 – ₱29,999",
      count: membersWithIncome.filter(
        (member: Resident) => {
          const income =
            Number(member?.monthlyIncome);

          return (
            income >= 20000 &&
            income < 30000
          );
        }
      ).length,
    },
    {
      label: "₱30,000 – ₱49,999",
      count: membersWithIncome.filter(
        (member: Resident) => {
          const income =
            Number(member?.monthlyIncome);

          return (
            income >= 30000 &&
            income < 50000
          );
        }
      ).length,
    },
    {
      label: "₱50,000 and above",
      count: membersWithIncome.filter(
        (member: Resident) =>
          Number(member?.monthlyIncome) >= 50000
      ).length,
    },
  ];

  const maxIncomeRangeCount = Math.max(
    ...incomeRanges.map(
      (item) => item.count
    ),
    1
  );

  // =========================
  // FORMAT CURRENCY
  // =========================

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(value);

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
          <ArrowLeft
            size={16}
            strokeWidth={1.8}
          />

          Back to Dashboard
        </button>

      </div>


      {/* =========================
          SUMMARY
      ========================= */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
          gap: "18px",
          marginBottom: "22px",
        }}
      >

        <div
          style={{
            background: "white",
            border: "1px solid #e7eaf0",
            borderRadius: "14px",
            padding: "24px",
          }}
        >

          <WalletCards
            size={24}
            strokeWidth={1.8}
          />

          <p
            style={{
              margin: "14px 0 6px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#7e8a9f",
              letterSpacing: "0.08em",
            }}
          >
            RESIDENTS WITH INCOME
          </p>

          <strong
            style={{
              fontSize: "28px",
              color: "#172033",
            }}
          >
            {membersWithIncome.length}
          </strong>

        </div>


        <div
          style={{
            background: "white",
            border: "1px solid #e7eaf0",
            borderRadius: "14px",
            padding: "24px",
          }}
        >

          <p
            style={{
              margin: "0 0 6px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#7e8a9f",
              letterSpacing: "0.08em",
            }}
          >
            TOTAL MONTHLY INCOME
          </p>

          <strong
            style={{
              fontSize: "28px",
              color: "#172033",
            }}
          >
            {formatCurrency(totalIncome)}
          </strong>

        </div>


        <div
          style={{
            background: "white",
            border: "1px solid #e7eaf0",
            borderRadius: "14px",
            padding: "24px",
          }}
        >

          <p
            style={{
              margin: "0 0 6px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#7e8a9f",
              letterSpacing: "0.08em",
            }}
          >
            AVERAGE MONTHLY INCOME
          </p>

          <strong
            style={{
              fontSize: "28px",
              color: "#172033",
            }}
          >
            {formatCurrency(averageIncome)}
          </strong>

        </div>


        <div
          style={{
            background: "white",
            border: "1px solid #e7eaf0",
            borderRadius: "14px",
            padding: "24px",
          }}
        >

          <p
            style={{
              margin: "0 0 6px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#7e8a9f",
              letterSpacing: "0.08em",
            }}
          >
            HIGHEST MONTHLY INCOME
          </p>

          <strong
            style={{
              fontSize: "28px",
              color: "#172033",
            }}
          >
            {formatCurrency(highestIncome)}
          </strong>

        </div>

      </div>


      {/* =========================
          INCOME DISTRIBUTION
      ========================= */}

      <section
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
            marginBottom: "6px",
          }}
        >

          <WalletCards
            size={20}
            strokeWidth={1.8}
          />

          <h2 style={{ margin: 0 }}>
            Income Distribution
          </h2>

        </div>

        <p
          style={{
            margin: "0 0 28px",
            color: "#758094",
            fontSize: "14px",
          }}
        >
          Distribution of residents according to estimated
          monthly income.
        </p>


        {membersWithIncome.length === 0 ? (

          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#758094",
            }}
          >

            <WalletCards
              size={36}
              strokeWidth={1.5}
            />

            <h3
              style={{
                color: "#172033",
                margin: "12px 0 6px",
              }}
            >
              No income data available
            </h3>

            <p style={{ margin: 0 }}>
              Income statistics will appear here once
              resident income data is available.
            </p>

          </div>

        ) : (

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >

            {incomeRanges.map((item) => {

              const percentage =
                (item.count /
                  maxIncomeRangeCount) *
                100;

              return (
                <div
                  key={item.label}
                >

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      marginBottom: "7px",
                      fontSize: "13px",
                    }}
                  >

                    <span
                      style={{
                        color: "#344054",
                        fontWeight: 500,
                      }}
                    >
                      {item.label}
                    </span>

                    <strong>
                      {item.count}
                    </strong>

                  </div>

                  <div
                    style={{
                      height: "10px",
                      background: "#edf1f6",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >

                    <div
                      style={{
                        width: `${percentage}%`,
                        height: "100%",
                        background: "#4361ee",
                        borderRadius: "999px",
                      }}
                    />

                  </div>

                </div>
              );
            })}

          </div>

        )}

      </section>


      {/* =========================
          INCOME RECORDS
      ========================= */}

      <section
        style={{
          marginTop: "22px",
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
            marginBottom: "20px",
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


        {membersWithIncome.length === 0 ? (

          <p
            style={{
              color: "#758094",
            }}
          >
            No resident income records found.
          </p>

        ) : (

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >

            {membersWithIncome.map(
              (member: Resident, index: number) => {

                const fullName =
  [
    member.firstName,
    member.middleName,
    member.lastName,
    member.suffix,
  ]
    .filter(Boolean)
    .join(" ") ||
  `Resident ${index + 1}`;

                return (
                  <div
                    key={`${fullName}-${index}`}
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      padding: "16px 18px",
                      border:
                        "1px solid #edf0f4",
                      borderRadius: "10px",
                    }}
                  >

                    <div>

                      <strong
                        style={{
                          display: "block",
                          color: "#172033",
                        }}
                      >
                        {fullName}
                      </strong>

                      {member?.primaryOccupation && (
  <small
    style={{
      color: "#758094",
    }}
  >
    {member.primaryOccupation}
  </small>
)}

                    </div>

                    <strong
                      style={{
                        color: "#172033",
                      }}
                    >
                      {formatCurrency(
                        Number(
                          member?.monthlyIncome || 0
                        )
                      )}
                    </strong>

                  </div>
                );
              }
            )}

          </div>

        )}

      </section>

    </main>
  );
}

export default Income;