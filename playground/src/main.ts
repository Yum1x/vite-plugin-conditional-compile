import "./style.css";

const render = (s: string) => {
  // @ts-expect-error
  const p = document.createElement("p");
  p.innerText = s;
  // @ts-expect-error
  document.body.appendChild(p);
};

render("no conditional");

/// #if DEV
render("Conditional: DEV");
/// #endif

/// #if PROD
render("Conditional: PROD");
/// #endif

/// #if !DEV
render("Conditional: !DEV");
/// #endif

/// #if !PROD
render("Conditional: !PROD");
/// #endif

/// #if DEV
render("Conditional: n DEV");
/// #endif

/// #if PROD
render("Conditional: n PROD");
/// #endif

/// #if (DEV||PROD)
render("Conditional: DEV||PROD");
/// #endif

/// #if (!DEV||PROD)
render("Conditional: !DEV||PROD");
/// #endif

/// #if DEV=true
render("Conditional: DEV=true");
/// #endif

/// #if PROD!=true
render("Conditional: PROD!=true");
/// #endif

/// #if !DEV=false
render("Conditional: !DEV=false");
/// #endif

/// #if !DEV!=true
render("Conditional: !DEV!=true");
/// #endif

/// #if (!DEV=true||PROD=true)
render("Conditional: !DEV=true||PROD=true");
// #v-else
render("Conditional: !DEV=true||PROD=true else");
/// #endif

/// #if (DEV!=true||PROD=true)
render("Conditional: n DEV!=true||PROD=true");
/// #endif
