"use client";

import { useState, type FormEvent } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { AVATAR_COLOR_NAMES, AVATAR_COLORS, AVATAR_ICON_NAMES, AVATAR_ICONS, DEFAULT_AVATAR_COLOR, DEFAULT_AVATAR_ICON, type AvatarColor, type AvatarIcon } from "@/domain/avatars";
import { ROUTE_PROFILE_LABELS } from "@/domain/events";
import { hasDuplicateActiveName, validateStudentName, NAME_MAX } from "@/domain/text";
import { ROUTE_PROFILES, type RouteProfile, type Student, type StudentInput } from "@/domain/types";
import { AVATAR_ICON_COMPONENTS, AVATAR_SWATCH, Avatar } from "./domainUi";
import { Button, Modal, TextField } from "./ui";

const PROFILE_HINT: Record<RouteProfile, string> = {
  ida_e_volta: "Participa dos 4 eventos",
  somente_ida: "Apenas embarque e desembarque da ida",
  somente_volta: "Apenas embarque e desembarque da volta",
};

export function StudentFormModal({
  open,
  student,
  students,
  onClose,
  onSave,
}: {
  open: boolean;
  student: Student | null;
  students: Student[];
  onClose: () => void;
  onSave: (input: StudentInput) => Promise<void>;
}) {
  return (
    <Modal open={open} onClose={onClose} title={student ? "Editar aluno" : "Novo aluno"}>
      {open && <StudentForm key={student?.id ?? "new"} student={student} students={students} onCancel={onClose} onSave={onSave} />}
    </Modal>
  );
}

function StudentForm({
  student,
  students,
  onCancel,
  onSave,
}: {
  student: Student | null;
  students: Student[];
  onCancel: () => void;
  onSave: (input: StudentInput) => Promise<void>;
}) {
  const [name, setName] = useState(student?.name ?? "");
  const [icon, setIcon] = useState<string>(student?.avatarIcon ?? DEFAULT_AVATAR_ICON);
  const [color, setColor] = useState<string>(student?.avatarColor ?? DEFAULT_AVATAR_COLOR);
  const [profile, setProfile] = useState<RouteProfile>(student?.routeProfile ?? "ida_e_volta");
  const [active, setActive] = useState(student?.active ?? true);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const nameError = validateStudentName(name);
  const duplicate = !nameError && active && hasDuplicateActiveName(students, name, student?.id);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (nameError) return;
    setSaving(true);
    try {
      await onSave({ name, avatarIcon: icon, avatarColor: color, routeProfile: profile, active });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div className="flex items-center gap-3">
        <Avatar icon={icon} color={color} size="lg" />
        <TextField
          className="flex-1"
          label="Nome do aluno"
          value={name}
          maxLength={NAME_MAX}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          error={touched ? nameError : null}
          autoFocus={!student}
        />
      </div>
      {duplicate && (
        <p className="-mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Já existe um aluno ativo com este nome. Considere incluir a inicial do sobrenome para evitar confusão.
        </p>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-800">Ícone do avatar</legend>
        <div className="grid grid-cols-6 gap-2">
          {AVATAR_ICONS.map((id) => {
            const Icon = AVATAR_ICON_COMPONENTS[id as AvatarIcon];
            const selected = icon === id;
            return (
              <button
                key={id}
                type="button"
                aria-label={`Ícone ${AVATAR_ICON_NAMES[id as AvatarIcon]}`}
                aria-pressed={selected}
                onClick={() => setIcon(id)}
                className={`flex aspect-square min-h-11 items-center justify-center rounded-xl ${
                  selected ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Icon className="size-6" aria-hidden />
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-800">Cor do avatar</legend>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => {
            const selected = color === c;
            return (
              <button
                key={c}
                type="button"
                aria-label={`Cor ${AVATAR_COLOR_NAMES[c as AvatarColor]}`}
                aria-pressed={selected}
                onClick={() => setColor(c)}
                className={`flex size-11 items-center justify-center rounded-full ${AVATAR_SWATCH[c as AvatarColor]} ${
                  selected ? "ring-4 ring-slate-900 ring-offset-2" : ""
                }`}
              >
                {selected && <Check className="size-5 text-slate-900" strokeWidth={3} aria-hidden />}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-800">Perfil de trajeto</legend>
        <div className="flex flex-col gap-2">
          {ROUTE_PROFILES.map((p) => (
            <label
              key={p}
              className={`flex min-h-13 cursor-pointer items-center gap-3 rounded-xl px-4 py-2 ring-1 ring-inset ${
                profile === p ? "bg-blue-50 ring-2 ring-blue-700" : "bg-white ring-slate-300"
              }`}
            >
              <input
                type="radio"
                name="routeProfile"
                value={p}
                checked={profile === p}
                onChange={() => setProfile(p)}
                className="size-5 accent-blue-700"
              />
              <span>
                <span className="block font-semibold text-slate-900">{ROUTE_PROFILE_LABELS[p]}</span>
                <span className="block text-sm text-slate-600">{PROFILE_HINT[p]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex min-h-13 cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 ring-1 ring-inset ring-slate-200">
        <span>
          <span className="block font-semibold text-slate-900">Aluno ativo</span>
          <span className="block text-sm text-slate-600">Somente alunos ativos entram na operação do dia.</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 ${
            active ? "bg-emerald-600" : "bg-slate-400"
          }`}
        >
          <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5.5" : "translate-x-0.5"}`} />
        </span>
      </label>

      <div className="sticky -bottom-4 -mx-5 -mb-4 flex gap-3 border-t border-slate-200 bg-white px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" loading={saving}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
