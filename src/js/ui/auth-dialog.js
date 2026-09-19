export function setAuthMode(dialog, mode) {
  const isLogin = mode === "login";
  dialog.querySelector("#login-form").hidden = !isLogin;
  dialog.querySelector("#register-form").hidden = isLogin;
  dialog.querySelector("#login-tab").setAttribute("aria-selected", String(isLogin));
  dialog.querySelector("#register-tab").setAttribute("aria-selected", String(!isLogin));
  dialog.querySelector("#auth-feedback").textContent = "";
}

export function setAuthFeedback(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

export function setFormBusy(form, isBusy, label) {
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = isBusy;
  submitButton.textContent = isBusy ? "Procesando..." : label;
}
