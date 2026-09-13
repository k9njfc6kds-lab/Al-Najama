/* =========================================================
   AL NAJMA CAR WASH
   Offline-first cashier / management system
   FINAL VERSION
   ========================================================= */

const DB_NAME = "AlNajmaCarWash";
const DB_VERSION = 5;

const STORES = [
    "orders",
    "customers",
    "workers",
    "packages",
    "expenses",
    "settings",
    "closures",
    "audit"
];

let db;

let state = {
    orders: [],
    customers: [],
    workers: [],
    packages: [],
    expenses: [],
    settings: {},
    closures: [],
    audit: []
};

let exportPeriod = {
    from: "",
    to: "",
    label: "Today"
};


/* =========================================================
   HELPERS
   ========================================================= */

const $ = selector => document.querySelector(selector);

const $$ = selector => [...document.querySelectorAll(selector)];

const uid = () => {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return Date.now() + "-" + Math.random().toString(36).slice(2);
};


function money(value) {
    return `${Math.round(Number(value) || 0).toLocaleString()} ${state.settings.currency || "IQD"}`;
}


function today() {
    return localDate(new Date());
}


function localDate(value) {

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
        return "";
    }

    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0")
    ].join("-");
}


function localDateTime(value) {

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
        return "—";
    }

    return d.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function showToast(message) {

    const container = $("#toast");

    if (!container) return;

    const el = document.createElement("div");

    el.className = "toast-message";
    el.textContent = message;

    container.appendChild(el);

    setTimeout(() => el.remove(), 3000);
}


function safeNumber(value, fallback = 0) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}


function normalizePlate(value) {

    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}


function isValidDateRange(from, to) {

    return Boolean(
        from &&
        to &&
        /^\d{4}-\d{2}-\d{2}$/.test(from) &&
        /^\d{4}-\d{2}-\d{2}$/.test(to) &&
        from <= to
    );

}


function dateDiffDays(from, to) {

    const a = new Date(`${from}T00:00:00`);
    const b = new Date(`${to}T00:00:00`);

    return Math.round(
        (b - a) / 86400000
    );

}


/* =========================================================
   INDEXED DB
   ========================================================= */

function openDatabase() {

    return new Promise((resolve, reject) => {

        const request =
            indexedDB.open(
                DB_NAME,
                DB_VERSION
            );


        request.onupgradeneeded = event => {

            const database =
                event.target.result;


            STORES.forEach(store => {

                if (
                    !database.objectStoreNames
                        .contains(store)
                ) {

                    database.createObjectStore(
                        store,
                        {
                            keyPath: "id"
                        }
                    );

                }

            });

        };


        request.onsuccess = () => {

            db = request.result;

            db.onversionchange = () => {
                db.close();
            };

            resolve();

        };


        request.onerror = () => {
            reject(request.error);
        };

    });

}


function getAll(store) {

    return new Promise((resolve, reject) => {

        const request =
            db.transaction(
                store,
                "readonly"
            )
            .objectStore(store)
            .getAll();


        request.onsuccess = () => {
            resolve(request.result || []);
        };


        request.onerror = () => {
            reject(request.error);
        };

    });

}


function put(store, value) {

    return new Promise((resolve, reject) => {

        const request =
            db.transaction(
                store,
                "readwrite"
            )
            .objectStore(store)
            .put(value);


        request.onsuccess = () => {
            resolve(value);
        };


        request.onerror = () => {
            reject(request.error);
        };

    });

}


function remove(store, id) {

    return new Promise((resolve, reject) => {

        const request =
            db.transaction(
                store,
                "readwrite"
            )
            .objectStore(store)
            .delete(id);


        request.onsuccess = () => {
            resolve();
        };


        request.onerror = () => {
            reject(request.error);
        };

    });

}


function clearStore(store) {

    return new Promise((resolve, reject) => {

        const request =
            db.transaction(
                store,
                "readwrite"
            )
            .objectStore(store)
            .clear();


        request.onsuccess = () => {
            resolve();
        };


        request.onerror = () => {
            reject(request.error);
        };

    });

}


async function loadState() {

    for (const store of STORES) {

        const values =
            await getAll(store);


        if (store === "settings") {

            state.settings =
                values.find(
                    x => x.id === "main"
                ) || {};

        } else {

            state[store] = values;

        }

    }

}


/* =========================================================
   INITIAL DATA
   ========================================================= */

async function seedDatabase() {

    const packages =
        await getAll("packages");

    const workers =
        await getAll("workers");

    const settings =
        await getAll("settings");


    if (!packages.length) {

        await put("packages", {
            id: uid(),
            name: "Basic Wash",
            price: 5000,
            active: true
        });


        await put("packages", {
            id: uid(),
            name: "Premium Wash",
            price: 10000,
            active: true,
            featured: true
        });


        await put("packages", {
            id: uid(),
            name: "Royal Detail",
            price: 20000,
            active: true
        });

    }


    if (!workers.length) {

        for (let i = 1; i <= 3; i++) {

            await put("workers", {

                id: uid(),

                name:
                    `Worker ${i}`,

                wage: 2000,

                active: true

            });

        }

    }


    if (!settings.length) {

        await put("settings", {

            id: "main",

            businessName:
                "Al Najma Car Wash",

            currency:
                "IQD",

            loyaltyThreshold:
                4,

            defaultWage:
                2000

        });

    }

}


/* =========================================================
   AUDIT
   ========================================================= */

async function audit(action, details) {

    try {

        await put("audit", {

            id: uid(),

            createdAt:
                new Date().toISOString(),

            action,

            details

        });

    } catch (error) {

        console.error(
            "Audit error:",
            error
        );

    }

}


/* =========================================================
   ORDER FILTERING
   ========================================================= */

function validOrders() {

    return state.orders.filter(
        order =>
            order.status !== "Refunded" &&
            order.status !== "Voided"
    );

}


function paidOrders() {

    return validOrders().filter(
        order =>
            order.paid === true ||
            order.payment === "Free"
    );

}


function ordersBetween(from, to) {

    if (!isValidDateRange(from, to)) {
        return [];
    }


    return paidOrders().filter(order => {

        const date =
            localDate(order.createdAt);

        return (
            date >= from &&
            date <= to
        );

    });

}


function expensesBetween(from, to) {

    if (!isValidDateRange(from, to)) {
        return [];
    }


    return state.expenses.filter(expense => {

        const date =
            localDate(expense.createdAt);

        return (
            date >= from &&
            date <= to
        );

    });

}


function refundedOrdersBetween(from, to) {

    if (!isValidDateRange(from, to)) {
        return [];
    }


    return state.orders.filter(order => {

        if (order.status !== "Refunded") {
            return false;
        }

        const date =
            localDate(
                order.refundedAt ||
                order.createdAt
            );

        return (
            date >= from &&
            date <= to
        );

    });

}


/* =========================================================
   PERIOD CALCULATION
   ========================================================= */

function calculatePeriod(from, to) {

    const orders =
        ordersBetween(
            from,
            to
        );


    const expenses =
        expensesBetween(
            from,
            to
        );


    const refunds =
        refundedOrdersBetween(
            from,
            to
        );


    const revenue =
        orders.reduce(
            (total, order) =>
                total +
                safeNumber(
                    order.finalPrice
                ),
            0
        );


    const expenseTotal =
        expenses.reduce(
            (total, expense) =>
                total +
                safeNumber(
                    expense.amount
                ),
            0
        );


    const wages =
        orders.reduce(
            (total, order) =>
                total +
                safeNumber(
                    order.workerWage
                ),
            0
        );


    const refundTotal =
        refunds.reduce(
            (total, order) =>
                total +
                safeNumber(
                    order.finalPrice
                ),
            0
        );


    const tips =
        orders.reduce(
            (total, order) =>
                total +
                safeNumber(
                    order.tip
                ),
            0
        );


    const discounts =
        orders.reduce(
            (total, order) =>
                total +
                safeNumber(
                    order.discount
                ),
            0
        );


    const freeWashes =
        orders.filter(
            order => order.freeWash
        ).length;


    return {

        orders,

        expenses,

        refunds,

        revenue,

        expenseTotal,

        wages,

        refundTotal,

        tips,

        discounts,

        freeWashes,

        profit:
            revenue -
            expenseTotal -
            wages,

        cars:
            orders.length,

        average:
            orders.length
                ? revenue / orders.length
                : 0

    };

}


/* =========================================================
   CUSTOMER REBUILD
   =========================================================

   Customer statistics are derived from order history.

   This prevents:
   - double-counting
   - unpaid → paid bugs
   - refund bugs
   - void bugs
   - loyalty counter corruption
   ========================================================= */

function customerOrders(plate) {

    const normalized =
        normalizePlate(plate);


    return state.orders
        .filter(order => {

            if (
                order.status === "Refunded" ||
                order.status === "Voided"
            ) {
                return false;
            }

            return (
                normalizePlate(order.plate) ===
                normalized
            );

        })
        .sort(
            (a,b) =>
                new Date(a.createdAt) -
                new Date(b.createdAt)
        );

}


function calculateCustomerStats(plate) {

    const orders =
        customerOrders(plate);


    const threshold =
        Math.max(
            1,
            safeNumber(
                state.settings.loyaltyThreshold,
                4
            )
        );


    let visits = 0;
    let paidWashes = 0;
    let totalSpent = 0;


    orders.forEach(order => {

        visits++;


        const isPaid =
            order.paid === true ||
            order.payment === "Free";


        if (!isPaid) {
            return;
        }


        if (order.freeWash) {

            paidWashes = 0;

        } else {

            paidWashes++;

            totalSpent +=
                safeNumber(
                    order.finalPrice
                );

        }

    });


    const lastVisit =
        orders.length
            ? orders[orders.length - 1].createdAt
            : "";


    return {

        visits,

        paidWashes,

        totalSpent,

        lastVisit,

        threshold

    };

}


async function rebuildCustomer(plate) {

    const normalized =
        normalizePlate(plate);


    if (!normalized) return;


    const customer =
        state.customers.find(
            c =>
                normalizePlate(c.plate) ===
                normalized
        );


    const orders =
        customerOrders(plate);


    if (!orders.length) {

        if (customer) {

            await remove(
                "customers",
                customer.id
            );

        }

        return;

    }


    const latest =
        orders[orders.length - 1];


    const stats =
        calculateCustomerStats(
            plate
        );


    const record =
        customer || {

            id: uid(),

            owner: "",

            phone: "",

            vehicle: "",

            plate: plate.trim(),

            visits: 0,

            paidWashes: 0,

            totalSpent: 0,

            lastVisit: ""

        };


    /*
       Keep the latest useful customer
       information from the order history.
    */

    record.owner =
        latest.customer ||
        record.owner ||
        "";

    record.phone =
        latest.phone ||
        record.phone ||
        "";

    record.vehicle =
        latest.vehicle ||
        record.vehicle ||
        "";

    record.plate =
        latest.plate ||
        record.plate ||
        plate.trim();


    record.visits =
        stats.visits;

    record.paidWashes =
        stats.paidWashes;

    record.totalSpent =
        stats.totalSpent;

    record.lastVisit =
        stats.lastVisit;


    await put(
        "customers",
        record
    );

}


async function rebuildAllCustomers() {

    const plates = new Set();


    state.orders.forEach(order => {

        const plate =
            normalizePlate(order.plate);

        if (plate) {
            plates.add(plate);
        }

    });


    for (const plate of plates) {

        const existing =
            state.customers.find(
                c =>
                    normalizePlate(c.plate) ===
                    plate
            );


        await rebuildCustomer(
            existing?.plate || plate
        );

    }


    /*
       Remove customer records that no longer
       have any valid order history.
    */

    const currentCustomers =
        await getAll("customers");


    for (
        const customer
        of currentCustomers
    ) {

        if (
            !customerOrders(
                customer.plate
            ).length
        ) {

            await remove(
                "customers",
                customer.id
            );

        }

    }

}


function getCustomerByPlate(plate) {

    const normalized =
        normalizePlate(plate);


    if (!normalized) {
        return null;
    }


    return state.customers.find(
        customer =>
            normalizePlate(
                customer.plate
            ) === normalized
    ) || null;

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function showPage(page) {

    $$(".page").forEach(section => {

        section.classList.toggle(
            "active",
            section.id === page
        );

    });


    $$(".nav").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.page === page
        );

    });


    const active =
        $(`.nav[data-page="${page}"] span`);


    if ($("#pageTitle")) {

        $("#pageTitle").textContent =
            active
                ? active.textContent
                : page;

    }


    if ($("#sidebar")) {

        $("#sidebar")
            .classList
            .remove("open");

    }


    window.scrollTo(
        0,
        0
    );

}


$$("[data-page]").forEach(button => {

    button.addEventListener(
        "click",
        () => {
            showPage(
                button.dataset.page
            );
        }
    );

});


if ($("#menuButton")) {

    $("#menuButton").onclick = () => {

        $("#sidebar")
            .classList
            .toggle("open");

    };

}


/* =========================================================
   RENDER
   ========================================================= */

async function refresh() {

    await loadState();

    await rebuildAllCustomers();

    await loadState();

    renderAll();

}


function renderAll() {

    renderPackageSelect();
    renderWorkerSelect();

    renderDashboard();
    renderOrders();
    renderCustomers();
    renderWorkers();
    renderPackages();
    renderExpenses();
    renderReports();
    renderSettings();
    renderExportPreview();

}


/* =========================================================
   NEW ORDER SELECTS
   ========================================================= */

function renderPackageSelect() {

    if (!$("#package")) return;


    $("#package").innerHTML =
        state.packages
            .filter(
                p => p.active !== false
            )
            .map(p =>
                `<option value="${escapeHTML(p.id)}">
                    ${escapeHTML(p.name)} — ${money(p.price)}
                </option>`
            )
            .join("");

}


function renderWorkerSelect() {

    if (!$("#worker")) return;


    $("#worker").innerHTML =
        `<option value="">Unassigned</option>` +

        state.workers
            .filter(
                w => w.active !== false
            )
            .map(w =>
                `<option value="${escapeHTML(w.id)}">
                    ${escapeHTML(w.name)} — ${money(w.wage)}/car
                </option>`
            )
            .join("");

}


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {

    if (!$("#dashboardKpis")) {
        return;
    }


    const period =
        calculatePeriod(
            today(),
            today()
        );


    const active =
        state.orders.filter(
            o =>
                ![
                    "Paid",
                    "Refunded",
                    "Voided"
                ].includes(o.status)
        ).length;


    $("#dashboardKpis").innerHTML = `

        <div class="kpi">
            <small>Today's Revenue</small>
            <strong>${money(period.revenue)}</strong>
        </div>

        <div class="kpi">
            <small>Cars Washed</small>
            <strong>${period.cars}</strong>
        </div>

        <div class="kpi">
            <small>Active Cars</small>
            <strong>${active}</strong>
        </div>

        <div class="kpi">
            <small>Net Profit</small>
            <strong>${money(period.profit)}</strong>
        </div>

    `;


    const orders =
        state.orders
            .filter(
                o =>
                    localDate(
                        o.createdAt
                    ) === today()
            )
            .sort(
                (a,b) =>
                    b.createdAt
                    .localeCompare(
                        a.createdAt
                    )
            )
            .slice(0,8);


    if ($("#dashboardOrders")) {

        $("#dashboardOrders").innerHTML =
            orders.length

                ? orders.map(order => `

                    <div class="stat-row">

                        <span>
                            ${escapeHTML(order.plate)}
                            ·
                            ${escapeHTML(order.packageName)}
                        </span>

                        <b class="money">
                            ${money(order.finalPrice)}
                        </b>

                    </div>

                `).join("")

                : `<div class="empty">
                    No orders today.
                   </div>`;

    }


    if ($("#dashboardSummary")) {

        $("#dashboardSummary").innerHTML = `

            <div class="stat-row">
                <span>Revenue</span>
                <b class="money">
                    ${money(period.revenue)}
                </b>
            </div>

            <div class="stat-row">
                <span>Expenses</span>
                <b>
                    ${money(period.expenseTotal)}
                </b>
            </div>

            <div class="stat-row">
                <span>Worker Wages</span>
                <b>
                    ${money(period.wages)}
                </b>
            </div>

            <div class="stat-row">
                <span>Net Profit</span>
                <b class="money">
                    ${money(period.profit)}
                </b>
            </div>

        `;

    }

}


/* =========================================================
   CREATE ORDER
   ========================================================= */

if ($("#orderForm")) {

    $("#orderForm").addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const plate =
                $("#plate")
                    .value
                    .trim();


            const vehicle =
                $("#vehicle")
                    .value
                    .trim();


            const owner =
                $("#customer")
                    .value
                    .trim();


            const phone =
                $("#phone")
                    .value
                    .trim();


            const packageId =
                $("#package").value;


            const workerId =
                $("#worker").value;


            const payment =
                $("#payment").value;


            const discount =
                Math.max(
                    0,
                    safeNumber(
                        $("#discount").value
                    )
                );


            const tip =
                Math.max(
                    0,
                    safeNumber(
                        $("#tip").value
                    )
                );


            const loyaltyFree =
                Boolean(
                    $("#loyaltyFree").checked
                );


            if (!plate) {

                showToast(
                    "Enter the vehicle plate."
                );

                return;

            }


            const selectedPackage =
                state.packages.find(
                    p =>
                        p.id === packageId
                );


            if (!selectedPackage) {

                showToast(
                    "Select a package."
                );

                return;

            }


            if (
                selectedPackage.active === false
            ) {

                showToast(
                    "This package is disabled."
                );

                return;

            }


            const packagePrice =
                Math.max(
                    0,
                    safeNumber(
                        selectedPackage.price
                    )
                );


            if (discount > packagePrice) {

                showToast(
                    "Discount cannot exceed the package price."
                );

                return;

            }


            const worker =
                state.workers.find(
                    w =>
                        w.id === workerId
                );


            /*
               Customer is primarily tracked
               by plate, exactly like the original.
            */

            let customer =
                getCustomerByPlate(
                    plate
                );


            /*
               Recalculate the current loyalty
               status directly from orders so it
               cannot be corrupted by an old record.
            */

            const customerStats =
                calculateCustomerStats(
                    plate
                );


            const threshold =
                customerStats.threshold;


            if (
                loyaltyFree &&
                customerStats.paidWashes <
                    threshold
            ) {

                showToast(
                    `Not eligible. ${customerStats.paidWashes} / ${threshold} paid washes.`
                );

                return;

            }


            let finalPrice =
                Math.max(
                    0,
                    packagePrice -
                    discount
                );


            let actualPayment =
                payment;


            if (loyaltyFree) {

                finalPrice = 0;

                actualPayment = "Free";

            }


            const paid =
                actualPayment !== "Unpaid";


            const createdAt =
                new Date().toISOString();


            const order = {

                id: uid(),

                createdAt,

                date:
                    localDate(
                        createdAt
                    ),

                plate,

                vehicle,

                customer:
                    owner ||
                    customer?.owner ||
                    "",

                phone:
                    phone ||
                    customer?.phone ||
                    "",

                packageId:
                    selectedPackage.id,

                packageName:
                    selectedPackage.name,

                originalPrice:
                    packagePrice,

                discount,

                finalPrice,

                payment:
                    actualPayment,

                workerId,

                workerName:
                    worker?.name ||
                    "",

                workerWage:
                    paid && worker
                        ? Math.max(
                            0,
                            safeNumber(
                                worker.wage
                            )
                        )
                        : 0,

                tip,

                status:
                    paid
                        ? "Paid"
                        : "Ready",

                paid,

                freeWash:
                    loyaltyFree,

                /*
                   These fields help preserve
                   historical meaning even if
                   the package/worker is edited
                   later.
                */

                packagePriceAtSale:
                    packagePrice,

                workerWageAtSale:
                    worker
                        ? Math.max(
                            0,
                            safeNumber(
                                worker.wage
                            )
                        )
                        : 0

            };


            await put(
                "orders",
                order
            );


            /*
               Customer is rebuilt from actual
               order history.
            */

            await loadState();

            await rebuildCustomer(
                plate
            );


            await audit(
                "CREATE_ORDER",
                order
            );


            await refresh();


            $("#orderForm").reset();


            showToast(
                "Order created successfully."
            );


            showPage("orders");

        }
    );

}


/* =========================================================
   ORDER LIST
   ========================================================= */

function renderOrders() {

    if (
        !$("#ordersTable") ||
        !$("#orderSearch") ||
        !$("#orderStatusFilter")
    ) {
        return;
    }


    const search =
        (
            $("#orderSearch").value ||
            ""
        )
        .toLowerCase();


    const filter =
        $("#orderStatusFilter").value;


    let orders =
        [...state.orders]
            .sort(
                (a,b) =>
                    b.createdAt
                    .localeCompare(
                        a.createdAt
                    )
            );


    orders =
        orders.filter(order => {

            const matchesSearch =
                [
                    order.plate,
                    order.vehicle,
                    order.customer,
                    order.phone,
                    order.packageName,
                    order.workerName,
                    order.payment,
                    order.status
                ]
                .join(" ")
                .toLowerCase()
                .includes(search);


            const matchesFilter =
                filter === "all" ||
                order.status === filter;


            return (
                matchesSearch &&
                matchesFilter
            );

        });


    $("#ordersTable").innerHTML =

        orders.length

        ? orders.map(order => `

        <tr>

            <td>
                ${localDateTime(
                    order.createdAt
                )}
            </td>

            <td>
                <b>
                    ${escapeHTML(
                        order.plate
                    )}
                </b>

                <br>

                <span class="muted">
                    ${escapeHTML(
                        order.vehicle
                    )}
                </span>
            </td>

            <td>
                ${escapeHTML(
                    order.customer ||
                    "—"
                )}

                <br>

                <span class="muted">
                    ${escapeHTML(
                        order.phone ||
                        ""
                    )}
                </span>
            </td>

            <td>
                ${escapeHTML(
                    order.packageName
                )}

                ${
                    order.freeWash
                    ? `<br>
                       <span class="badge">
                       LOYALTY FREE
                       </span>`
                    : ""
                }

            </td>

            <td>
                ${escapeHTML(
                    order.workerName ||
                    "—"
                )}
            </td>

            <td class="money">

                ${money(
                    order.finalPrice
                )}

                ${
                    order.discount
                    ? `<br>
                       <span class="muted">
                       −${money(
                           order.discount
                       )}
                       </span>`
                    : ""
                }

            </td>

            <td>
                ${escapeHTML(
                    order.payment
                )}
            </td>

            <td>

                <span class="badge">
                    ${escapeHTML(
                        order.status
                    )}
                </span>

            </td>

            <td>

                <div class="actions">

                ${
                    ![
                        "Paid",
                        "Refunded",
                        "Voided"
                    ].includes(order.status)

                    ? `<button
                        class="small-button"
                        onclick="advanceOrder('${order.id}')">
                        Next
                       </button>`
                    : ""
                }

                <button
                    class="small-button"
                    onclick="printReceipt('${order.id}')">
                    Receipt
                </button>

                ${
                    ![
                        "Refunded",
                        "Voided"
                    ].includes(order.status)

                    ? `<button
                        class="small-button"
                        onclick="refundOrder('${order.id}')">
                        Refund
                       </button>`
                    : ""
                }

                ${
                    ![
                        "Refunded",
                        "Voided"
                    ].includes(order.status)

                    ? `<button
                        class="small-button"
                        onclick="voidOrder('${order.id}')">
                        Void
                       </button>`
                    : ""
                }

                </div>

            </td>

        </tr>

        `).join("")

        : `
        <tr>
            <td colspan="9" class="empty">
                No orders found.
            </td>
        </tr>
        `;

}


if ($("#orderSearch")) {

    $("#orderSearch").addEventListener(
        "input",
        renderOrders
    );

}


if ($("#orderStatusFilter")) {

    $("#orderStatusFilter").addEventListener(
        "change",
        renderOrders
    );

}


/* =========================================================
   ORDER STATUS
   ========================================================= */

async function advanceOrder(id) {

    const order =
        state.orders.find(
            o => o.id === id
        );


    if (!order) return;


    if (
        [
            "Refunded",
            "Voided",
            "Paid"
        ].includes(order.status)
    ) {
        return;
    }


    const flow = [
        "Waiting",
        "Washing",
        "Drying",
        "Ready",
        "Paid"
    ];


    const index =
        flow.indexOf(
            order.status
        );


    if (index < 0) return;


    const oldStatus =
        order.status;


    order.status =
        flow[
            Math.min(
                index + 1,
                flow.length - 1
            )
        ];


    if (order.status === "Paid") {

        order.paid = true;


        /*
           If an order was created as unpaid,
           Cash becomes its default payment
           method when it is finally paid.
        */

        if (
            !order.payment ||
            order.payment === "Unpaid"
        ) {

            order.payment =
                "Cash";

        }


        if (
            !order.workerWage &&
            order.workerId
        ) {

            const worker =
                state.workers.find(
                    w =>
                        w.id ===
                        order.workerId
                );


            order.workerWage =
                Math.max(
                    0,
                    safeNumber(
                        worker?.wage
                    )
                );


            order.workerWageAtSale =
                order.workerWage;

            order.workerName =
                worker?.name || "";

        }

    }


    await put(
        "orders",
        order
    );


    /*
       IMPORTANT:
       This fixes the old unpaid → paid
       customer tracking bug.
    */

    await loadState();

    await rebuildCustomer(
        order.plate
    );


    await audit(
        "ADVANCE_ORDER",
        {
            id,
            from: oldStatus,
            status: order.status
        }
    );


    await refresh();


    showToast(
        `Order → ${order.status}`
    );

}


window.advanceOrder =
    advanceOrder;


/* =========================================================
   VOID / REFUND
   ========================================================= */

async function voidOrder(id) {

    const order =
        state.orders.find(
            o => o.id === id
        );


    if (!order) return;


    if (
        [
            "Refunded",
            "Voided"
        ].includes(order.status)
    ) {
        return;
    }


    if (
        !confirm(
            "Void this order?"
        )
    ) {
        return;
    }


    const oldStatus =
        order.status;


    order.status =
        "Voided";


    order.voidedAt =
        new Date().toISOString();


    await put(
        "orders",
        order
    );


    /*
       Customer statistics are rebuilt
       without this order.
    */

    await loadState();

    await rebuildCustomer(
        order.plate
    );


    await audit(
        "VOID_ORDER",
        {
            order,
            previousStatus: oldStatus
        }
    );


    await refresh();


    showToast(
        "Order voided."
    );

}


window.voidOrder =
    voidOrder;


async function refundOrder(id) {

    const order =
        state.orders.find(
            o => o.id === id
        );


    if (!order) return;


    if (
        [
            "Refunded",
            "Voided"
        ].includes(order.status)
    ) {
        return;
    }


    if (!order.paid) {

        showToast(
            "Unpaid orders should be voided, not refunded."
        );

        return;

    }


    if (
        !confirm(
            `Refund ${money(order.finalPrice)} for this order?`
        )
    ) {
        return;
    }


    order.status =
        "Refunded";


    order.refundedAt =
        new Date().toISOString();


    await put(
        "orders",
        order
    );


    /*
       Rebuild customer history so the
       refunded wash no longer contributes
       to spending or loyalty.
    */

    await loadState();

    await rebuildCustomer(
        order.plate
    );


    await audit(
        "REFUND_ORDER",
        order
    );


    await refresh();


    showToast(
        "Order refunded."
    );

}


window.refundOrder =
    refundOrder;


/* =========================================================
   CUSTOMERS
   ========================================================= */

function renderCustomers() {

    if (
        !$("#customersTable") ||
        !$("#customerSearch")
    ) {
        return;
    }


    const search =
        (
            $("#customerSearch").value ||
            ""
        )
        .toLowerCase();


    const threshold =
        Math.max(
            1,
            safeNumber(
                state.settings.loyaltyThreshold,
                4
            )
        );


    const customers =
        state.customers
            .filter(customer =>
                [
                    customer.owner,
                    customer.phone,
                    customer.vehicle,
                    customer.plate
                ]
                .join(" ")
                .toLowerCase()
                .includes(search)
            )
            .sort(
                (a,b) =>
                    String(
                        b.lastVisit || ""
                    )
                    .localeCompare(
                        String(
                            a.lastVisit || ""
                        )
                    )
            );


    $("#customersTable").innerHTML =

        customers.length

        ? customers.map(customer => {

            const progress =
                Number(
                    customer.paidWashes || 0
                ) % threshold;


            return `

            <tr>

                <td>
                    ${escapeHTML(
                        customer.owner ||
                        "—"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        customer.vehicle
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        customer.plate
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        customer.phone ||
                        ""
                    )}
                </td>

                <td>
                    ${customer.visits || 0}
                </td>

                <td>
                    ${customer.paidWashes || 0}
                </td>

                <td>

                    <b>
                        ${progress} / ${threshold}
                    </b>

                    <div class="progress">
                        <i style="
                        width:${Math.min(
                            100,
                            progress /
                            threshold *
                            100
                        )}%">
                        </i>
                    </div>

                </td>

                <td class="money">
                    ${money(
                        customer.totalSpent
                    )}
                </td>

                <td>
                    ${
                        customer.lastVisit
                        ? localDateTime(
                            customer.lastVisit
                        )
                        : "—"
                    }
                </td>

            </tr>

            `;

        }).join("")

        : `
        <tr>
            <td colspan="9" class="empty">
                No customers yet.
            </td>
        </tr>
        `;

}


if ($("#customerSearch")) {

    $("#customerSearch").addEventListener(
        "input",
        renderCustomers
    );

}


/* =========================================================
   WORKERS
   ========================================================= */

function renderWorkers() {

    if (!$("#workersGrid")) {
        return;
    }


    $("#workersGrid").innerHTML =
        state.workers.map(worker => {

            const orders =
                paidOrders()
                    .filter(
                        o =>
                            o.workerId ===
                            worker.id
                    );


            const wages =
                orders.reduce(
                    (sum,o) =>
                        sum +
                        safeNumber(
                            o.workerWage
                        ),
                    0
                );


            const tips =
                orders.reduce(
                    (sum,o) =>
                        sum +
                        safeNumber(
                            o.tip
                        ),
                    0
                );


            return `

            <div class="worker-card">

                <h3>
                    ${escapeHTML(
                        worker.name
                    )}
                </h3>

                <div class="muted">
                    ${
                        worker.active === false
                            ? "Inactive"
                            : "Active"
                    }
                </div>

                <div class="big-price">
                    ${money(
                        worker.wage
                    )}
                    <small>/ car</small>
                </div>

                <div class="stat-row">
                    <span>Completed Cars</span>
                    <b>${orders.length}</b>
                </div>

                <div class="stat-row">
                    <span>Wages</span>
                    <b>${money(wages)}</b>
                </div>

                <div class="stat-row">
                    <span>Tips</span>
                    <b>${money(tips)}</b>
                </div>

                <div class="actions">

                    <button
                        class="small-button"
                        onclick="editWorker('${worker.id}')">
                        Edit
                    </button>

                    <button
                        class="small-button"
                        onclick="toggleWorker('${worker.id}')">
                        ${
                            worker.active === false
                                ? "Enable"
                                : "Disable"
                        }
                    </button>

                    <button
                        class="small-button"
                        onclick="removeWorker('${worker.id}')">
                        Remove
                    </button>

                </div>

            </div>

            `;

        }).join("");

}


if ($("#addWorker")) {

    $("#addWorker").onclick = () => {

        openModal(

            "Add Worker",

            `
            <form id="workerForm" class="stack">

                <label>
                    Worker Name
                    <input
                        id="modalWorkerName"
                        required>
                </label>

                <label>
                    Wage Per Car
                    <input
                        id="modalWorkerWage"
                        type="number"
                        value="${safeNumber(
                            state.settings.defaultWage,
                            2000
                        )}"
                        min="0"
                        required>
                </label>

                <button class="gold-button">
                    Save Worker
                </button>

            </form>
            `,

            async () => {

                const name =
                    $("#modalWorkerName")
                        .value
                        .trim();


                if (!name) {

                    showToast(
                        "Enter a worker name."
                    );

                    return;

                }


                const worker = {

                    id: uid(),

                    name,

                    wage:
                        Math.max(
                            0,
                            safeNumber(
                                $("#modalWorkerWage")
                                    .value
                            )
                        ),

                    active: true

                };


                await put(
                    "workers",
                    worker
                );


                await audit(
                    "ADD_WORKER",
                    worker
                );


                await refresh();


                showToast(
                    "Worker added."
                );

            }
        );

    };

}


async function editWorker(id) {

    const worker =
        state.workers.find(
            w => w.id === id
        );


    if (!worker) return;


    openModal(

        "Edit Worker",

        `
        <form id="workerEditForm" class="stack">

            <label>
                Name
                <input
                    id="modalWorkerName"
                    value="${escapeHTML(
                        worker.name
                    )}"
                    required>
            </label>

            <label>
                Wage Per Car
                <input
                    id="modalWorkerWage"
                    type="number"
                    min="0"
                    value="${safeNumber(
                        worker.wage
                    )}"
                    required>
            </label>

            <button class="gold-button">
                Save
            </button>

        </form>
        `,

        async () => {

            const name =
                $("#modalWorkerName")
                    .value
                    .trim();


            if (!name) {

                showToast(
                    "Enter a worker name."
                );

                return;

            }


            worker.name =
                name;


            worker.wage =
                Math.max(
                    0,
                    safeNumber(
                        $("#modalWorkerWage")
                            .value
                    )
                );


            await put(
                "workers",
                worker
            );


            await audit(
                "EDIT_WORKER",
                worker
            );


            await refresh();


            showToast(
                "Worker updated."
            );

        }

    );

}


window.editWorker =
    editWorker;


async function toggleWorker(id) {

    const worker =
        state.workers.find(
            w => w.id === id
        );


    if (!worker) return;


    worker.active =
        worker.active === false;


    await put(
        "workers",
        worker
    );


    await audit(
        "TOGGLE_WORKER",
        {
            id,
            active: worker.active
        }
    );


    await refresh();

}


window.toggleWorker =
    toggleWorker;


async function removeWorker(id) {

    if (
        !confirm(
            "Remove this worker from the active worker list? Existing order history will remain."
        )
    ) {
        return;
    }


    /*
       We disable rather than physically delete
       the worker so historical records remain
       intact.
    */

    const worker =
        state.workers.find(
            w => w.id === id
        );


    if (!worker) return;


    worker.active = false;


    await put(
        "workers",
        worker
    );


    await audit(
        "REMOVE_WORKER",
        {
            id,
            name: worker.name
        }
    );


    await refresh();


    showToast(
        "Worker removed from active list."
    );

}


window.removeWorker =
    removeWorker;


/* =========================================================
   PACKAGES
   ========================================================= */

function renderPackages() {

    if (!$("#packagesGrid")) {
        return;
    }


    $("#packagesGrid").innerHTML =
        state.packages
            .map(
                packageItem => `

        <div class="package-card">

            <h3>
                ${escapeHTML(
                    packageItem.name
                )}
            </h3>

            <div class="big-price">
                ${money(
                    packageItem.price
                )}
            </div>

            <div class="muted">
                ${
                    packageItem.active === false
                        ? "Disabled"
                        : "Available"
                }
            </div>

            <div class="actions">

                <button
                    class="small-button"
                    onclick="editPackage('${packageItem.id}')">
                    Edit
                </button>

                <button
                    class="small-button"
                    onclick="togglePackage('${packageItem.id}')">
                    ${
                        packageItem.active === false
                            ? "Enable"
                            : "Disable"
                    }
                </button>

                <button
                    class="small-button"
                    onclick="removePackage('${packageItem.id}')">
                    Delete
                </button>

            </div>

        </div>

        `
            )
            .join("");

}


if ($("#addPackage")) {

    $("#addPackage").onclick = () => {

        openModal(

            "Add Package",

            `
            <form id="packageForm" class="stack">

                <label>
                    Package Name
                    <input
                        id="modalPackageName"
                        required>
                </label>

                <label>
                    Price
                    <input
                        id="modalPackagePrice"
                        type="number"
                        min="0"
                        value="5000"
                        required>
                </label>

                <button class="gold-button">
                    Save Package
                </button>

            </form>
            `,

            async () => {

                const name =
                    $("#modalPackageName")
                        .value
                        .trim();


                if (!name) {

                    showToast(
                        "Enter a package name."
                    );

                    return;

                }


                const item = {

                    id: uid(),

                    name,

                    price:
                        Math.max(
                            0,
                            safeNumber(
                                $("#modalPackagePrice")
                                    .value
                            )
                        ),

                    active: true

                };


                await put(
                    "packages",
                    item
                );


                await audit(
                    "ADD_PACKAGE",
                    item
                );


                await refresh();


                showToast(
                    "Package added."
                );

            }
        );

    };

}


async function editPackage(id) {

    const item =
        state.packages.find(
            p => p.id === id
        );


    if (!item) return;


    openModal(

        "Edit Package",

        `
        <form id="packageEditForm" class="stack">

            <label>
                Package Name
                <input
                    id="modalPackageName"
                    value="${escapeHTML(
                        item.name
                    )}"
                    required>
            </label>

            <label>
                Price
                <input
                    id="modalPackagePrice"
                    type="number"
                    min="0"
                    value="${safeNumber(
                        item.price
                    )}"
                    required>
            </label>

            <button class="gold-button">
                Save
            </button>

        </form>
        `,

        async () => {

            const name =
                $("#modalPackageName")
                    .value
                    .trim();


            if (!name) {

                showToast(
                    "Enter a package name."
                );

                return;

            }


            item.name =
                name;


            item.price =
                Math.max(
                    0,
                    safeNumber(
                        $("#modalPackagePrice")
                            .value
                    )
                );


            await put(
                "packages",
                item
            );


            await audit(
                "EDIT_PACKAGE",
                item
            );


            await refresh();


            showToast(
                "Package updated."
            );

        }

    );

}


window.editPackage =
    editPackage;


async function togglePackage(id) {

    const item =
        state.packages.find(
            p => p.id === id
        );


    if (!item) return;


    item.active =
        item.active === false;


    await put(
        "packages",
        item
    );


    await audit(
        "TOGGLE_PACKAGE",
        {
            id,
            active: item.active
        }
    );


    await refresh();

}


window.togglePackage =
    togglePackage;


async function removePackage(id) {

    if (
        !confirm(
            "Delete this package from the active list? Existing orders will remain."
        )
    ) {
        return;
    }


    const item =
        state.packages.find(
            p => p.id === id
        );


    if (!item) return;


    /*
       Disable rather than physically delete
       so historical package information remains.
    */

    item.active = false;


    await put(
        "packages",
        item
    );


    await audit(
        "DELETE_PACKAGE",
        {
            id,
            name: item.name
        }
    );


    await refresh();


    showToast(
        "Package removed from active list."
    );

}


window.removePackage =
    removePackage;


/* =========================================================
   EXPENSES
   ========================================================= */

function renderExpenses() {

    if (!$("#expensesTable")) {
        return;
    }


    const expenses =
        [...state.expenses]
            .sort(
                (a,b) =>
                    b.createdAt
                    .localeCompare(
                        a.createdAt
                    )
            );


    $("#expensesTable").innerHTML =

        expenses.length

        ? expenses.map(expense => `

        <tr>

            <td>
                ${localDateTime(
                    expense.createdAt
                )}
            </td>

            <td>
                ${escapeHTML(
                    expense.description
                )}
            </td>

            <td>
                ${escapeHTML(
                    expense.category
                )}
            </td>

            <td class="money">
                ${money(
                    expense.amount
                )}
            </td>

            <td>

                <button
                    class="small-button"
                    onclick="deleteExpense('${expense.id}')">
                    Delete
                </button>

            </td>

        </tr>

        `).join("")

        : `
        <tr>
            <td colspan="5" class="empty">
                No expenses.
            </td>
        </tr>
        `;

}


if ($("#addExpense")) {

    $("#addExpense").onclick = () => {

        openModal(

            "Add Expense",

            `
            <form id="expenseForm" class="stack">

                <label>
                    Description
                    <input
                        id="modalExpenseDescription"
                        required>
                </label>

                <label>
                    Category
                    <input
                        id="modalExpenseCategory"
                        value="General">
                </label>

                <label>
                    Amount
                    <input
                        id="modalExpenseAmount"
                        type="number"
                        min="0"
                        required>
                </label>

                <button class="gold-button">
                    Save Expense
                </button>

            </form>
            `,

            async () => {

                const description =
                    $("#modalExpenseDescription")
                        .value
                        .trim();


                const amount =
                    Math.max(
                        0,
                        safeNumber(
                            $("#modalExpenseAmount")
                                .value
                        )
                    );


                if (!description) {

                    showToast(
                        "Enter an expense description."
                    );

                    return;

                }


                if (amount <= 0) {

                    showToast(
                        "Enter a valid expense amount."
                    );

                    return;

                }


                const expense = {

                    id: uid(),

                    createdAt:
                        new Date()
                            .toISOString(),

                    description,

                    category:
                        $("#modalExpenseCategory")
                            .value
                            .trim() ||
                        "General",

                    amount,

                    /*
                       Existing UI remains the same.
                       Expenses are treated as cash for
                       daily cash reconciliation.
                    */

                    payment:
                        "Cash"

                };


                await put(
                    "expenses",
                    expense
                );


                await audit(
                    "ADD_EXPENSE",
                    expense
                );


                await refresh();


                showToast(
                    "Expense added."
                );

            }
        );

    };

}


async function deleteExpense(id) {

    if (
        !confirm(
            "Delete this expense?"
        )
    ) {
        return;
    }


    const expense =
        state.expenses.find(
            e => e.id === id
        );


    await remove(
        "expenses",
        id
    );


    await audit(
        "DELETE_EXPENSE",
        expense || {id}
    );


    await refresh();


    showToast(
        "Expense deleted."
    );

}


window.deleteExpense =
    deleteExpense;


/* =========================================================
   REPORTS
   ========================================================= */

function renderReports() {

    if (
        !$("#reportContent") ||
        !$("#reportFrom") ||
        !$("#reportTo")
    ) {
        return;
    }


    const from =
        $("#reportFrom").value ||
        today();


    const to =
        $("#reportTo").value ||
        today();


    if (!isValidDateRange(from, to)) {

        $("#reportContent").innerHTML = `
            <div class="empty">
                Choose a valid date range.
            </div>
        `;

        return;

    }


    const data =
        calculatePeriod(
            from,
            to
        );


    const workerRows =
        state.workers.map(worker => {

            const orders =
                data.orders.filter(
                    o =>
                        o.workerId ===
                        worker.id
                );


            const wages =
                orders.reduce(
                    (sum,o) =>
                        sum +
                        safeNumber(
                            o.workerWage
                        ),
                    0
                );


            const tips =
                orders.reduce(
                    (sum,o) =>
                        sum +
                        safeNumber(
                            o.tip
                        ),
                    0
                );


            return `

            <tr>

                <td>
                    ${escapeHTML(
                        worker.name
                    )}
                </td>

                <td>
                    ${orders.length}
                </td>

                <td>
                    ${money(wages)}
                </td>

                <td>
                    ${money(tips)}
                </td>

            </tr>

            `;

        }).join("");


    const days = {};


    data.orders.forEach(order => {

        const d =
            localDate(
                order.createdAt
            );


        if (!days[d]) {

            days[d] = {

                cars: 0,
                revenue: 0,
                wages: 0,
                expenses: 0

            };

        }


        days[d].cars++;

        days[d].revenue +=
            safeNumber(
                order.finalPrice
            );

        days[d].wages +=
            safeNumber(
                order.workerWage
            );

    });


    data.expenses.forEach(expense => {

        const d =
            localDate(
                expense.createdAt
            );


        if (!days[d]) {

            days[d] = {

                cars: 0,
                revenue: 0,
                wages: 0,
                expenses: 0

            };

        }


        days[d].expenses +=
            safeNumber(
                expense.amount
            );

    });


    const dailyRows =
        Object.keys(days)
            .sort()
            .map(date => {

                const d =
                    days[date];


                const net =
                    d.revenue -
                    d.expenses -
                    d.wages;


                return `

                <tr>

                    <td>${date}</td>

                    <td>${d.cars}</td>

                    <td class="money">
                        ${money(
                            d.revenue
                        )}
                    </td>

                    <td>
                        ${money(
                            d.expenses
                        )}
                    </td>

                    <td>
                        ${money(
                            d.wages
                        )}
                    </td>

                    <td class="money">
                        ${money(net)}
                    </td>

                </tr>

                `;

            })
            .join("");


    $("#reportContent").innerHTML = `

        <h2>
            ${from} → ${to}
        </h2>

        <div class="summary-grid">

            <div class="summary-item">
                <small>Revenue</small>
                <strong>
                    ${money(
                        data.revenue
                    )}
                </strong>
            </div>

            <div class="summary-item">
                <small>Cars</small>
                <strong>
                    ${data.cars}
                </strong>
            </div>

            <div class="summary-item">
                <small>Expenses</small>
                <strong>
                    ${money(
                        data.expenseTotal
                    )}
                </strong>
            </div>

            <div class="summary-item">
                <small>Worker Wages</small>
                <strong>
                    ${money(
                        data.wages
                    )}
                </strong>
            </div>

            <div class="summary-item">
                <small>Net Profit</small>
                <strong>
                    ${money(
                        data.profit
                    )}
                </strong>
            </div>

            <div class="summary-item">
                <small>Average / Car</small>
                <strong>
                    ${money(
                        data.average
                    )}
                </strong>
            </div>

            <div class="summary-item">
                <small>Discounts</small>
                <strong>
                    ${money(
                        data.discounts
                    )}
                </strong>
            </div>

            <div class="summary-item">
                <small>Free Washes</small>
                <strong>
                    ${data.freeWashes}
                </strong>
            </div>

            <div class="summary-item">
                <small>Refunds</small>
                <strong>
                    ${money(
                        data.refundTotal
                    )}
                </strong>
            </div>

        </div>


        <h3>Worker Performance</h3>

        <div class="table-container">

        <table>

        <thead>

        <tr>

        <th>Worker</th>
        <th>Cars</th>
        <th>Wages</th>
        <th>Tips</th>

        </tr>

        </thead>

        <tbody>

        ${workerRows}

        </tbody>

        </table>

        </div>


        <h3>Daily Summary</h3>

        <div class="table-container">

        <table>

        <thead>

        <tr>

        <th>Date</th>
        <th>Cars</th>
        <th>Revenue</th>
        <th>Expenses</th>
        <th>Wages</th>
        <th>Net</th>

        </tr>

        </thead>

        <tbody>

        ${
            dailyRows ||
            `
            <tr>
                <td colspan="6" class="empty">
                    No activity.
                </td>
            </tr>
            `
        }

        </tbody>

        </table>

        </div>

    `;

}


if ($("#reportFrom")) {
    $("#reportFrom").value = today();
}

if ($("#reportTo")) {
    $("#reportTo").value = today();
}

if ($("#runReport")) {

    $("#runReport").onclick =
        renderReports;

}


/* =========================================================
   EXPORT PERIODS
   ========================================================= */

function getExportPeriod(type) {

    const now =
        new Date();


    const y =
        now.getFullYear();


    const m =
        now.getMonth();


    if (type === "today") {

        return {

            from: today(),

            to: today(),

            label: "Today"

        };

    }


    if (type === "week") {

        const start =
            new Date(now);


        const day =
            (
                start.getDay() +
                6
            ) % 7;


        start.setDate(
            start.getDate() -
            day
        );


        const end =
            new Date(start);


        end.setDate(
            start.getDate() +
            6
        );


        return {

            from:
                localDate(start),

            to:
                localDate(end),

            label:
                "This Week"

        };

    }


    if (type === "month") {

        return {

            from:
                `${y}-${String(
                    m + 1
                ).padStart(
                    2,
                    "0"
                )}-01`,

            to:
                localDate(
                    new Date(
                        y,
                        m + 1,
                        0
                    )
                ),

            label:
                "This Month"

        };

    }


    if (type === "year") {

        return {

            from:
                `${y}-01-01`,

            to:
                `${y}-12-31`,

            label:
                "This Year"

        };

    }


    if (type === "previousWeek") {

        const start =
            new Date(now);


        const day =
            (
                start.getDay() +
                6
            ) % 7;


        start.setDate(
            start.getDate() -
            day -
            7
        );


        const end =
            new Date(start);


        end.setDate(
            start.getDate() +
            6
        );


        return {

            from:
                localDate(start),

            to:
                localDate(end),

            label:
                "Previous Week"

        };

    }


    if (type === "previousMonth") {

        return {

            from:
                localDate(
                    new Date(
                        y,
                        m - 1,
                        1
                    )
                ),

            to:
                localDate(
                    new Date(
                        y,
                        m,
                        0
                    )
                ),

            label:
                "Previous Month"

        };

    }


    if (type === "previousYear") {

        return {

            from:
                `${y - 1}-01-01`,

            to:
                `${y - 1}-12-31`,

            label:
                "Previous Year"

        };

    }


    return null;

}


$$("[data-export]").forEach(button => {

    button.onclick = () => {

        const type =
            button.dataset.export;


        if (type === "custom") {

            if ($("#customExport")) {

                $("#customExport")
                    .classList
                    .remove("hidden");

            }

            $$("[data-export]")
                .forEach(
                    b =>
                        b.classList
                            .remove("active")
                );


            button.classList.add(
                "active"
            );


            return;

        }


        if ($("#customExport")) {

            $("#customExport")
                .classList
                .add("hidden");

        }


        const period =
            getExportPeriod(
                type
            );


        if (!period) return;


        exportPeriod =
            period;


        $$("[data-export]")
            .forEach(
                b =>
                    b.classList
                        .remove("active")
            );


        button.classList.add(
            "active"
        );


        renderExportPreview();

    };

});


function updateCustomExport() {

    const from =
        $("#exportFrom")?.value || "";


    const to =
        $("#exportTo")?.value || "";


    exportPeriod = {

        from,

        to,

        label:
            "Custom Range"

    };


    renderExportPreview();

}


if ($("#exportFrom")) {

    $("#exportFrom").onchange =
        updateCustomExport;

}


if ($("#exportTo")) {

    $("#exportTo").onchange =
        updateCustomExport;

}


exportPeriod =
    getExportPeriod(
        "today"
    );


function renderExportPreview() {

    if (
        !exportPeriod.from ||
        !exportPeriod.to ||
        !$("#exportPreview")
    ) {
        return;
    }


    const data =
        calculatePeriod(
            exportPeriod.from,
            exportPeriod.to
        );


    $("#exportPreview").innerHTML = `

        <div class="summary-grid">

            <div class="summary-item">
                <small>Period</small>
                <strong>
                    ${escapeHTML(
                        exportPeriod.label
                    )}
                </strong>
            </div>

            <div class="summary-item">
                <small>Cars</small>
                <strong>
                    ${data.cars}
                </strong>
            </div>

            <div class="summary-item">
                <small>Revenue</small>
                <strong>
                    ${money(
                        data.revenue
                    )}
                </strong>
            </div>

            <div class="summary-item">
                <small>Refunds</small>
                <strong>
                    ${money(
                        data.refundTotal
                    )}
                </strong>
            </div>

            <div class="summary-item">
                <small>Expenses</small>
                <strong>
                    ${money(
                        data.expenseTotal
                    )}
                </strong>
            </div>

            <div class="summary-item">
                <small>Net Profit</small>
                <strong>
                    ${money(
                        data.profit
                    )}
                </strong>
            </div>

        </div>

    `;

}


/* =========================================================
   XLSX HELPERS
   ========================================================= */

const CRC_TABLE =
    (() => {

        const table = [];

        for (
            let n = 0;
            n < 256;
            n++
        ) {

            let c = n;

            for (
                let k = 0;
                k < 8;
                k++
            ) {

                c =
                    c & 1
                        ? 0xedb88320 ^
                          (c >>> 1)
                        : c >>> 1;

            }

            table[n] =
                c >>> 0;

        }

        return table;

    })();


function crc32(bytes) {

    let crc =
        0xffffffff;


    for (const byte of bytes) {

        crc =
            CRC_TABLE[
                (crc ^ byte) &
                255
            ] ^
            (crc >>> 8);

    }


    return (
        crc ^
        0xffffffff
    ) >>> 0;

}


function u16(n) {

    return new Uint8Array([

        n & 255,

        (n >>> 8) & 255

    ]);

}


function u32(n) {

    return new Uint8Array([

        n & 255,

        (n >>> 8) & 255,

        (n >>> 16) & 255,

        (n >>> 24) & 255

    ]);

}


function concatBytes(...arrays) {

    const total =
        arrays.reduce(
            (sum,a) =>
                sum +
                a.length,
            0
        );


    const output =
        new Uint8Array(total);


    let offset = 0;


    arrays.forEach(array => {

        output.set(
            array,
            offset
        );

        offset +=
            array.length;

    });


    return output;

}


const encoder =
    new TextEncoder();


function makeZip(files) {

    const localParts = [];
    const centralParts = [];

    let offset = 0;


    for (const file of files) {

        const name =
            encoder.encode(
                file.name
            );


        const data =
            encoder.encode(
                file.data
            );


        const crc =
            crc32(data);


        const local =
            concatBytes(

                u32(
                    0x04034b50
                ),

                u16(20),
                u16(0),
                u16(0),
                u16(0),
                u16(0),

                u32(crc),

                u32(data.length),
                u32(data.length),

                u16(name.length),
                u16(0),

                name,
                data

            );


        localParts.push(
            local
        );


        const central =
            concatBytes(

                u32(
                    0x02014b50
                ),

                u16(20),
                u16(20),

                u16(0),
                u16(0),
                u16(0),
                u16(0),

                u32(crc),

                u32(data.length),
                u32(data.length),

                u16(name.length),

                u16(0),
                u16(0),
                u16(0),
                u16(0),

                u32(0),
                u32(offset),

                name

            );


        centralParts.push(
            central
        );


        offset +=
            local.length;

    }


    const locals =
        concatBytes(
            ...localParts
        );


    const central =
        concatBytes(
            ...centralParts
        );


    const end =
        concatBytes(

            u32(
                0x06054b50
            ),

            u16(0),
            u16(0),

            u16(files.length),
            u16(files.length),

            u32(central.length),
            u32(locals.length),

            u16(0)

        );


    return new Blob(
        [
            concatBytes(
                locals,
                central,
                end
            )
        ],
        {
            type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
    );

}


function xmlEscape(value) {

    return String(
        value ?? ""
    )
    .replaceAll(
        "&",
        "&amp;"
    )
    .replaceAll(
        "<",
        "&lt;"
    )
    .replaceAll(
        ">",
        "&gt;"
    )
    .replaceAll(
        '"',
        "&quot;"
    )
    .replaceAll(
        "'",
        "&apos;"
    );

}


/*
   Proper Excel column letters:
   A ... Z, AA ... AZ, BA ...
*/

function excelColumn(index) {

    let result = "";

    let n =
        Number(index);


    while (n >= 0) {

        result =
            String.fromCharCode(
                (n % 26) + 65
            ) +
            result;


        n =
            Math.floor(
                n / 26
            ) - 1;

    }


    return result;

}


function worksheetXML(rows) {

    let xml =
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<sheetData>`;


    rows.forEach(
        (row,rowIndex) => {

            xml +=
                `<row r="${rowIndex + 1}">`;


            row.forEach(
                (value,columnIndex) => {

                    const column =
                        excelColumn(
                            columnIndex
                        );


                    const reference =
                        `${column}${rowIndex + 1}`;


                    if (
                        typeof value ===
                        "number" &&
                        Number.isFinite(
                            value
                        )
                    ) {

                        xml +=
                            `<c r="${reference}">` +
                            `<v>${value}</v>` +
                            `</c>`;

                    } else {

                        xml +=
                            `<c r="${reference}" t="inlineStr">` +
                            `<is><t xml:space="preserve">` +
                            xmlEscape(value) +
                            `</t></is>` +
                            `</c>`;

                    }

                }
            );


            xml +=
                "</row>";

        }
    );


    xml +=
        "</sheetData></worksheet>";


    return xml;

}


function createWorkbook(sheets) {

    const sheetLinks =
        sheets.map(
            (sheet,index) =>
                `<sheet name="${xmlEscape(
                    sheet.name.substring(
                        0,
                        31
                    )
                )}"
                sheetId="${index + 1}"
                r:id="rId${index + 1}"/>`
        )
        .join("");


    const files = [];


    files.push({

        name:
            "[Content_Types].xml",

        data:

`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">

<Default Extension="rels"
ContentType="application/vnd.openxmlformats-package.relationships+xml"/>

<Default Extension="xml"
ContentType="application/xml"/>

<Override PartName="/xl/workbook.xml"
ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>

${sheets.map(
    (_,i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml"
        ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
).join("")}

</Types>`

    });


    files.push({

        name:
            "_rels/.rels",

        data:

`<?xml version="1.0" encoding="UTF-8"?>

<Relationships
xmlns="http://schemas.openxmlformats.org/package/2006/relationships">

<Relationship
Id="rId1"
Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
Target="xl/workbook.xml"/>

</Relationships>`

    });


    files.push({

        name:
            "xl/workbook.xml",

        data:

`<?xml version="1.0" encoding="UTF-8"?>

<workbook
xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">

<sheets>
${sheetLinks}
</sheets>

</workbook>`

    });


    files.push({

        name:
            "xl/_rels/workbook.xml.rels",

        data:

`<?xml version="1.0" encoding="UTF-8"?>

<Relationships
xmlns="http://schemas.openxmlformats.org/package/2006/relationships">

${sheets.map(
    (_,i) =>
        `<Relationship
        Id="rId${i + 1}"
        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
        Target="worksheets/sheet${i + 1}.xml"/>`
).join("")}

</Relationships>`

    });


    sheets.forEach(
        (sheet,index) => {

            files.push({

                name:
                    `xl/worksheets/sheet${index + 1}.xml`,

                data:
                    worksheetXML(
                        sheet.rows
                    )

            });

        }
    );


    return makeZip(
        files
    );

}


/* =========================================================
   EXCEL EXPORT
   ========================================================= */

function exportExcel() {

    if (
        !isValidDateRange(
            exportPeriod.from,
            exportPeriod.to
        )
    ) {

        showToast(
            "Choose a valid date range."
        );

        return;

    }


    const data =
        calculatePeriod(
            exportPeriod.from,
            exportPeriod.to
        );


    const summary = [

        ["AL NAJMA CAR WASH"],

        [
            "Export Period",
            exportPeriod.label
        ],

        [
            "From",
            exportPeriod.from
        ],

        [
            "To",
            exportPeriod.to
        ],

        [],

        ["Metric","Value"],

        ["Revenue",data.revenue],

        ["Refunds",data.refundTotal],

        ["Expenses",data.expenseTotal],

        ["Worker Wages",data.wages],

        ["Net Profit",data.profit],

        ["Cars Washed",data.cars],

        [
            "Average Revenue / Car",
            data.average
        ],

        [
            "Discounts",
            data.discounts
        ],

        [
            "Free Washes",
            data.freeWashes
        ],

        [
            "Tips",
            data.tips
        ]

    ];


    const orders = [

        [
            "Date / Time",
            "Plate",
            "Vehicle",
            "Owner",
            "Phone",
            "Package",
            "Original Price",
            "Discount",
            "Final Price",
            "Payment",
            "Worker",
            "Worker Wage",
            "Tip",
            "Status",
            "Loyalty Free",
            "Order ID",
            "Voided At",
            "Refunded At"
        ]

    ];


    /*
       Export all orders whose created date is
       in the selected range, including unpaid,
       voided and refunded records.

       This is important because an export should
       contain the complete operational history,
       not only revenue-generating orders.
    */

    const exportOrders =
        state.orders.filter(order => {

            const date =
                localDate(
                    order.createdAt
                );

            return (
                date >=
                    exportPeriod.from &&
                date <=
                    exportPeriod.to
            );

        })
        .sort(
            (a,b) =>
                a.createdAt
                .localeCompare(
                    b.createdAt
                )
        );


    exportOrders.forEach(order => {

        orders.push([

            localDateTime(
                order.createdAt
            ),

            order.plate,

            order.vehicle,

            order.customer,

            order.phone,

            order.packageName,

            safeNumber(
                order.originalPrice
            ),

            safeNumber(
                order.discount
            ),

            safeNumber(
                order.finalPrice
            ),

            order.payment,

            order.workerName,

            safeNumber(
                order.workerWage
            ),

            safeNumber(
                order.tip
            ),

            order.status,

            order.freeWash
                ? "Yes"
                : "No",

            order.id,

            order.voidedAt
                ? localDateTime(
                    order.voidedAt
                )
                : "",

            order.refundedAt
                ? localDateTime(
                    order.refundedAt
                )
                : ""

        ]);

    });


    const workers = [

        [
            "Worker",
            "Cars Washed",
            "Wage / Car",
            "Total Wages",
            "Tips",
            "Total Earnings"
        ]

    ];


    state.workers.forEach(worker => {

        const workerOrders =
            data.orders.filter(
                o =>
                    o.workerId ===
                    worker.id
            );


        const wages =
            workerOrders.reduce(
                (a,o) =>
                    a +
                    safeNumber(
                        o.workerWage
                    ),
                0
            );


        const tips =
            workerOrders.reduce(
                (a,o) =>
                    a +
                    safeNumber(
                        o.tip
                    ),
                0
            );


        workers.push([

            worker.name,

            workerOrders.length,

            safeNumber(
                worker.wage
            ),

            wages,

            tips,

            wages + tips

        ]);

    });


    const customers = [

        [
            "Owner",
            "Phone",
            "Vehicle",
            "Plate",
            "All Visits",
            "Paid Washes",
            "Total Spending",
            "Visits In Period",
            "Last Visit",
            "Loyalty Progress"
        ]

    ];


    const threshold =
        Math.max(
            1,
            safeNumber(
                state.settings.loyaltyThreshold,
                4
            )
        );


    state.customers.forEach(customer => {

        const visits =
            data.orders.filter(
                order =>
                    normalizePlate(
                        order.plate
                    ) ===
                    normalizePlate(
                        customer.plate
                    )
            ).length;


        customers.push([

            customer.owner,

            customer.phone,

            customer.vehicle,

            customer.plate,

            safeNumber(
                customer.visits
            ),

            safeNumber(
                customer.paidWashes
            ),

            safeNumber(
                customer.totalSpent
            ),

            visits,

            customer.lastVisit
                ? localDateTime(
                    customer.lastVisit
                )
                : "",

            `${safeNumber(
                customer.paidWashes
            ) % threshold} / ${threshold}`

        ]);

    });


    const expenses = [

        [
            "Date / Time",
            "Description",
            "Category",
            "Amount",
            "Payment",
            "ID"
        ]

    ];


    data.expenses.forEach(expense => {

        expenses.push([

            localDateTime(
                expense.createdAt
            ),

            expense.description,

            expense.category,

            safeNumber(
                expense.amount
            ),

            expense.payment ||
                "Cash",

            expense.id

        ]);

    });


    const dailyMap = {};


    data.orders.forEach(order => {

        const date =
            localDate(
                order.createdAt
            );


        if (!dailyMap[date]) {

            dailyMap[date] = {

                cars: 0,
                revenue: 0,
                wages: 0,
                expenses: 0

            };

        }


        dailyMap[date].cars++;

        dailyMap[date].revenue +=
            safeNumber(
                order.finalPrice
            );

        dailyMap[date].wages +=
            safeNumber(
                order.workerWage
            );

    });


    data.expenses.forEach(expense => {

        const date =
            localDate(
                expense.createdAt
            );


        if (!dailyMap[date]) {

            dailyMap[date] = {

                cars: 0,
                revenue: 0,
                wages: 0,
                expenses: 0

            };

        }


        dailyMap[date].expenses +=
            safeNumber(
                expense.amount
            );

    });


    const daily = [

        [
            "Date",
            "Cars",
            "Revenue",
            "Expenses",
            "Worker Wages",
            "Net Profit"
        ]

    ];


    Object.keys(dailyMap)
        .sort()
        .forEach(date => {

            const d =
                dailyMap[date];


            daily.push([

                date,

                d.cars,

                d.revenue,

                d.expenses,

                d.wages,

                d.revenue -
                d.expenses -
                d.wages

            ]);

        });


    const workbook =
        createWorkbook([

            {
                name:
                    "Summary",

                rows:
                    summary
            },

            {
                name:
                    "Orders",

                rows:
                    orders
            },

            {
                name:
                    "Workers",

                rows:
                    workers
            },

            {
                name:
                    "Customers",

                rows:
                    customers
            },

            {
                name:
                    "Expenses",

                rows:
                    expenses
            },

            {
                name:
                    "Daily Summary",

                rows:
                    daily
            }

        ]);


    const link =
        document.createElement(
            "a"
        );


    const url =
        URL.createObjectURL(
            workbook
        );


    link.href = url;


    link.download =
        `Al-Najma-${exportPeriod.from}-to-${exportPeriod.to}.xlsx`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    setTimeout(
        () =>
            URL.revokeObjectURL(
                url
            ),
        2000
    );


    audit(
        "EXPORT_EXCEL",
        exportPeriod
    );


    showToast(
        "Excel workbook exported."
    );

}


if ($("#exportExcel")) {

    $("#exportExcel").onclick =
        exportExcel;

}


/* =========================================================
   RECEIPT PRINTING
   ========================================================= */

function printReceipt(id) {

    const order =
        state.orders.find(
            o => o.id === id
        );


    if (!order) return;


    const printWindow =
        window.open(
            "",
            "_blank",
            "width=420,height=700"
        );


    if (!printWindow) {

        showToast(
            "Allow popups to print receipts."
        );

        return;

    }


    printWindow.document.write(`

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>
Al Najma Receipt
</title>

<style>

body{
font-family:Arial,sans-serif;
padding:25px;
width:320px;
margin:auto;
}

h1{
text-align:center;
letter-spacing:3px;
}

.center{
text-align:center;
}

.row{
display:flex;
justify-content:space-between;
gap:15px;
margin:10px 0;
}

.total{
font-size:21px;
font-weight:bold;
}

hr{
border:0;
border-top:1px solid #ddd;
}

.small{
font-size:12px;
color:#666;
}

</style>

</head>

<body>

<h1>
✦ AL NAJMA
</h1>

<p class="center">
CAR WASH
</p>

<hr>

<div class="row">
<span>Date</span>
<b>
${escapeHTML(
    localDateTime(
        order.createdAt
    )
)}
</b>
</div>

<div class="row">
<span>Order</span>
<b>
${escapeHTML(
    order.id
)}
</b>
</div>

<div class="row">
<span>Plate</span>
<b>
${escapeHTML(
    order.plate
)}
</b>
</div>

<div class="row">
<span>Vehicle</span>
<b>
${escapeHTML(
    order.vehicle
)}
</b>
</div>

<div class="row">
<span>Customer</span>
<b>
${escapeHTML(
    order.customer ||
    "—"
)}
</b>
</div>

<hr>

<div class="row">
<span>Package</span>
<b>
${escapeHTML(
    order.packageName
)}
</b>
</div>

<div class="row">
<span>Original</span>
<b>
${money(
    order.originalPrice
)}
</b>
</div>

<div class="row">
<span>Discount</span>
<b>
-${money(
    order.discount
)}
</b>
</div>

<div class="row total">
<span>TOTAL</span>
<b>
${money(
    order.finalPrice
)}
</b>
</div>

<div class="row">
<span>Payment</span>
<b>
${escapeHTML(
    order.payment
)}
</b>
</div>

${
    order.workerName
    ? `
    <div class="row">
        <span>Worker</span>
        <b>
            ${escapeHTML(
                order.workerName
            )}
        </b>
    </div>
    `
    : ""
}

${
    safeNumber(order.tip) > 0
    ? `
    <div class="row">
        <span>Tip</span>
        <b>
            ${money(order.tip)}
        </b>
    </div>
    `
    : ""
}

${
    order.freeWash
    ? `
    <p class="center">
        <b>LOYALTY FREE WASH</b>
    </p>
    `
    : ""
}

<hr>

<p class="center">
Thank you for choosing Al Najma ✦
</p>

<p class="center small">
Al Najma Car Wash
</p>

<script>
window.onload=()=>window.print()
<\/script>

</body>

</html>

`);


    printWindow.document.close();

}


window.printReceipt =
    printReceipt;


/* =========================================================
   SETTINGS
   ========================================================= */

function renderSettings() {

    if (
        !$("#businessName") ||
        !$("#currency") ||
        !$("#loyaltyThreshold") ||
        !$("#defaultWage")
    ) {
        return;
    }


    $("#businessName").value =
        state.settings.businessName ||
        "Al Najma Car Wash";


    $("#currency").value =
        state.settings.currency ||
        "IQD";


    $("#loyaltyThreshold").value =
        state.settings.loyaltyThreshold ||
        4;


    $("#defaultWage").value =
        state.settings.defaultWage ||
        2000;


    if ($("#databaseInfo")) {

        $("#databaseInfo").textContent =

            `${state.orders.length} orders · ` +
            `${state.customers.length} customers · ` +
            `${state.workers.length} workers · ` +
            `${state.expenses.length} expenses`;

    }

}


if ($("#settingsForm")) {

    $("#settingsForm").onsubmit =
        async event => {

            event.preventDefault();


            state.settings = {

                id:
                    "main",

                businessName:
                    $("#businessName")
                        .value
                        .trim() ||
                    "Al Najma Car Wash",

                currency:
                    $("#currency")
                        .value
                        .trim() ||
                    "IQD",

                loyaltyThreshold:
                    Math.max(
                        1,
                        safeNumber(
                            $("#loyaltyThreshold")
                                .value,
                            4
                        )
                    ),

                defaultWage:
                    Math.max(
                        0,
                        safeNumber(
                            $("#defaultWage")
                                .value,
                            2000
                        )
                    )

            };


            await put(
                "settings",
                state.settings
            );


            /*
               Changing the loyalty threshold
               should immediately recalculate
               displayed customer progress.
            */

            await audit(
                "SAVE_SETTINGS",
                state.settings
            );


            await refresh();


            showToast(
                "Settings saved."
            );

        };

}


/* =========================================================
   BACKUP / IMPORT
   ========================================================= */

if ($("#backup")) {

    $("#backup").onclick =
        async () => {

            const backup = {

                version: 2,

                exportedAt:
                    new Date()
                        .toISOString(),

                stores: {}

            };


            for (
                const store
                of STORES
            ) {

                backup.stores[store] =
                    await getAll(
                        store
                    );

            }


            const blob =
                new Blob(
                    [
                        JSON.stringify(
                            backup,
                            null,
                            2
                        )
                    ],
                    {
                        type:
                            "application/json"
                    }
                );


            downloadFile(
                blob,
                `Al-Najma-backup-${today()}.json`
            );


            showToast(
                "Backup created."
            );

        };

}


if ($("#importBackup")) {

    $("#importBackup").onchange =
        async event => {

            const file =
                event.target.files[0];


            if (!file) return;


            try {

                const text =
                    await file.text();


                const data =
                    JSON.parse(
                        text
                    );


                if (
                    !data ||
                    !data.stores ||
                    typeof data.stores !==
                        "object"
                ) {

                    throw new Error(
                        "Invalid backup"
                    );

                }


                if (
                    !confirm(
                        "Import this backup and replace the current local data?"
                    )
                ) {

                    event.target.value =
                        "";

                    return;

                }


                for (
                    const store
                    of STORES
                ) {

                    await clearStore(
                        store
                    );

                }


                for (
                    const store
                    of STORES
                ) {

                    const items =
                        Array.isArray(
                            data.stores[store]
                        )
                            ? data.stores[store]
                            : [];


                    for (
                        const item
                        of items
                    ) {

                        if (
                            item &&
                            item.id !==
                                undefined
                        ) {

                            await put(
                                store,
                                item
                            );

                        }

                    }

                }


                /*
                   If an older backup did not
                   contain the newer stores/settings,
                   seed the missing defaults.
                */

                await seedDatabase();

                await loadState();

                await rebuildAllCustomers();

                await refresh();


                showToast(
                    "Backup imported successfully."
                );


            } catch (error) {

                console.error(
                    error
                );


                showToast(
                    "Invalid backup file."
                );

            }


            event.target.value =
                "";

        };

}


function downloadFile(
    blob,
    filename
) {

    const url =
        URL.createObjectURL(
            blob
        );


    const a =
        document.createElement(
            "a"
        );


    a.href =
        url;


    a.download =
        filename;


    document.body.appendChild(
        a
    );


    a.click();


    a.remove();


    setTimeout(
        () =>
            URL.revokeObjectURL(
                url
            ),
        2000
    );

}


/* =========================================================
   DAILY CASH CLOSING
   ========================================================= */

function getCashPosition(from, to) {

    const sales =
        ordersBetween(
            from,
            to
        )
        .filter(
            o =>
                o.payment ===
                "Cash"
        )
        .reduce(
            (sum,o) =>
                sum +
                safeNumber(
                    o.finalPrice
                ),
            0
        );


    const refunds =
        refundedOrdersBetween(
            from,
            to
        )
        .filter(
            o =>
                o.payment ===
                "Cash"
        )
        .reduce(
            (sum,o) =>
                sum +
                safeNumber(
                    o.finalPrice
                ),
            0
        );


    const expenses =
        expensesBetween(
            from,
            to
        )
        .filter(
            e =>
                (
                    e.payment ||
                    "Cash"
                ) ===
                "Cash"
        )
        .reduce(
            (sum,e) =>
                sum +
                safeNumber(
                    e.amount
                ),
            0
        );


    return {

        sales,

        refunds,

        expenses,

        expected:
            sales -
            refunds -
            expenses

    };

}


if ($("#closeDay")) {

    $("#closeDay").onclick =
        () => {

            const data =
                calculatePeriod(
                    today(),
                    today()
                );


            const cash =
                getCashPosition(
                    today(),
                    today()
                );


            openModal(

                "Close Today's Cash",

                `

                <div class="stat-row">
                    <span>Cash Sales</span>
                    <b>
                        ${money(
                            cash.sales
                        )}
                    </b>
                </div>

                <div class="stat-row">
                    <span>Cash Refunds</span>
                    <b>
                        ${money(
                            cash.refunds
                        )}
                    </b>
                </div>

                <div class="stat-row">
                    <span>Cash Expenses</span>
                    <b>
                        ${money(
                            cash.expenses
                        )}
                    </b>
                </div>

                <div class="stat-row">
                    <span>Expected Cash</span>
                    <b>
                        ${money(
                            cash.expected
                        )}
                    </b>
                </div>

                <div class="stat-row">
                    <span>Total Revenue</span>
                    <b>
                        ${money(
                            data.revenue
                        )}
                    </b>
                </div>

                <label>
                    Actual Cash Counted
                    <input
                        id="closingCash"
                        type="number"
                        value="${cash.expected}">
                </label>

                <label>
                    Closing Note
                    <input
                        id="closingNote">
                </label>

                `,

                async () => {

                    const actual =
                        safeNumber(
                            $("#closingCash")
                                .value
                        );


                    const closing = {

                        id:
                            today(),

                        date:
                            today(),

                        createdAt:
                            new Date()
                                .toISOString(),

                        cashSales:
                            cash.sales,

                        cashRefunds:
                            cash.refunds,

                        cashExpenses:
                            cash.expenses,

                        expectedCash:
                            cash.expected,

                        actualCash:
                            actual,

                        difference:
                            actual -
                            cash.expected,

                        revenue:
                            data.revenue,

                        expenses:
                            data.expenseTotal,

                        wages:
                            data.wages,

                        note:
                            $("#closingNote")
                                .value
                                .trim()

                    };


                    await put(
                        "closures",
                        closing
                    );


                    await audit(
                        "DAILY_CLOSING",
                        closing
                    );


                    await refresh();


                    showToast(
                        "Today's cash closed."
                    );

                }

            );

        };

}


if ($("#printClosing")) {

    $("#printClosing").onclick =
        () => {

            const data =
                calculatePeriod(
                    today(),
                    today()
                );


            const cash =
                getCashPosition(
                    today(),
                    today()
                );


            const closing =
                state.closures.find(
                    c =>
                        c.id ===
                        today()
                );


            const w =
                window.open(
                    "",
                    "_blank",
                    "width=420,height=700"
                );


            if (!w) {

                showToast(
                    "Allow popups to print."
                );

                return;

            }


            w.document.write(`

            <html>

            <body style="
            font-family:Arial;
            padding:25px;
            ">

            <h2>
            ✦ AL NAJMA
            </h2>

            <h3>
            DAILY CLOSING
            </h3>

            <p>
            ${today()}
            </p>

            <hr>

            <p>
            Cars:
            <b>${data.cars}</b>
            </p>

            <p>
            Revenue:
            <b>${money(
                data.revenue
            )}</b>
            </p>

            <p>
            Expenses:
            <b>${money(
                data.expenseTotal
            )}</b>
            </p>

            <p>
            Worker Wages:
            <b>${money(
                data.wages
            )}</b>
            </p>

            <p>
            Net:
            <b>${money(
                data.profit
            )}</b>
            </p>

            <hr>

            <p>
            Cash Sales:
            <b>${money(
                cash.sales
            )}</b>
            </p>

            <p>
            Cash Refunds:
            <b>${money(
                cash.refunds
            )}</b>
            </p>

            <p>
            Cash Expenses:
            <b>${money(
                cash.expenses
            )}</b>
            </p>

            <p>
            Expected Cash:
            <b>${money(
                cash.expected
            )}</b>
            </p>

            ${
                closing
                ? `

                <p>
                Actual Cash:
                <b>${money(
                    closing.actualCash
                )}</b>
                </p>

                <p>
                Difference:
                <b>${money(
                    closing.difference
                )}</b>
                </p>

                `
                : ""
            }

            <script>
            window.onload=()=>window.print()
            <\/script>

            </body>

            </html>

            `);


            w.document.close();

        };

}


/* =========================================================
   MODAL
   ========================================================= */

function openModal(
    title,
    body,
    saveFunction
) {

    if (
        !$("#modal") ||
        !$("#modalBody")
    ) {
        return;
    }


    $("#modalBody").innerHTML = `

        <h2>
            ${escapeHTML(title)}
        </h2>

        ${body}

    `;


    $("#modal")
        .classList
        .remove("hidden");


    const form =
        $("#modalBody form");


    if (form) {

        form.onsubmit =
            async event => {

                event.preventDefault();


                try {

                    await saveFunction();

                    closeModal();

                } catch (error) {

                    console.error(
                        error
                    );

                    showToast(
                        "Could not save."
                    );

                }

            };

    } else {

        const button =
            $("#modalBody .gold-button");


        if (button) {

            button.onclick =
                async event => {

                    event.preventDefault();


                    try {

                        await saveFunction();

                        closeModal();

                    } catch (error) {

                        console.error(
                            error
                        );

                        showToast(
                            "Could not save."
                        );

                    }

                };

        }

    }

}


function closeModal() {

    if ($("#modal")) {

        $("#modal")
            .classList
            .add("hidden");

    }

}


if ($("#closeModal")) {

    $("#closeModal").onclick =
        closeModal;

}


if ($("#modal")) {

    $("#modal").onclick =
        event => {

            if (
                event.target.id ===
                "modal"
            ) {

                closeModal();

            }

        };

}


/* =========================================================
   CONNECTION / CLOCK
   ========================================================= */

function updateConnection() {

    if (!$("#connectionStatus")) {
        return;
    }


    $("#connectionStatus")
        .textContent =
            navigator.onLine
                ? "Online · Offline data ready"
                : "Offline · Data saved locally";

}


window.addEventListener(
    "online",
    updateConnection
);


window.addEventListener(
    "offline",
    updateConnection
);


setInterval(
    () => {

        if ($("#liveClock")) {

            $("#liveClock")
                .textContent =
                    new Date()
                        .toLocaleString();

        }

    },
    1000
);


/* =========================================================
   DELETE EVERYTHING
   ========================================================= */

if ($("#deleteData")) {

    $("#deleteData").onclick =
        async () => {

            if (
                !confirm(
                    "Delete ALL business data on this device? This cannot be undone. Make a backup first."
                )
            ) {
                return;
            }


            /*
               Extra confirmation for destructive
               operation.
            */

            if (
                !confirm(
                    "Are you absolutely sure? All orders, customers, workers, packages, expenses and reports will be deleted."
                )
            ) {
                return;
            }


            for (
                const store
                of STORES
            ) {

                await clearStore(
                    store
                );

            }


            await seedDatabase();


            await refresh();


            showToast(
                "Business data reset."
            );

        };

}


/* =========================================================
   START
   ========================================================= */

async function init() {

    try {

        await openDatabase();

        await seedDatabase();

        await loadState();

        /*
           Repair/rebuild customer statistics
           when opening the app. This also repairs
           data created by the previous version.
        */

        await rebuildAllCustomers();

        await loadState();


        exportPeriod =
            getExportPeriod(
                "today"
            );


        updateConnection();

        renderAll();


        if (
            "serviceWorker"
            in navigator
        ) {

            await navigator.serviceWorker
                .register(
                    "./sw.js"
                );

        }


    } catch (error) {

        console.error(
            error
        );


        showToast(
            "Could not start the database."
        );

    }

}


init();
