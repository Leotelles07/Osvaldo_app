/**
 * Liga um <form> de acesso ao DOM: lê os campos, mostra o erro embaixo de
 * cada um, trava o botão enquanto o Firebase responde.
 *
 * Convenção do HTML: cada <input name="…"> tem logo depois um
 * <span class="field__error">, e o formulário tem um [data-form-message].
 */
import type { AuthField, FieldErrors } from '../auth/validation';

export interface AuthForm {
  values(): Record<AuthField, string>;
  showErrors(errors: FieldErrors): void;
  showMessage(message: string): void;
  clear(): void;
  setBusy(busy: boolean): void;
  focusFirst(): void;
}

export function bindAuthForm(form: HTMLFormElement, busyLabel: string): AuthForm {
  const inputs = [...form.querySelectorAll<HTMLInputElement>('input[name]')];
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const message = form.querySelector<HTMLElement>('[data-form-message]')!;
  const idleLabel = submit.textContent ?? '';

  const errorSlot = (input: HTMLInputElement) =>
    input.parentElement!.querySelector<HTMLElement>('.field__error')!;

  const setFieldError = (input: HTMLInputElement, text = '') => {
    errorSlot(input).textContent = text;
    errorSlot(input).hidden = !text;
    if (text) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  };

  // Começou a corrigir: o aviso daquele campo some.
  for (const input of inputs) {
    input.addEventListener('input', () => {
      setFieldError(input);
      message.hidden = true;
    });
  }

  return {
    values() {
      const out = { name: '', email: '', password: '' };
      for (const input of inputs) out[input.name as AuthField] = input.value;
      return out;
    },
    showErrors(errors) {
      let first: HTMLInputElement | null = null;
      for (const input of inputs) {
        const text = errors[input.name as AuthField];
        setFieldError(input, text);
        if (text && !first) first = input;
      }
      first?.focus();
    },
    showMessage(text) {
      message.textContent = text;
      message.hidden = !text;
    },
    clear() {
      for (const input of inputs) {
        if (input.type === 'password') input.value = '';
        setFieldError(input);
      }
      message.hidden = true;
    },
    setBusy(busy) {
      submit.disabled = busy;
      submit.textContent = busy ? busyLabel : idleLabel;
      form.setAttribute('aria-busy', String(busy));
    },
    focusFirst() {
      (inputs.find((input) => !input.value) ?? inputs[0])?.focus();
    },
  };
}
