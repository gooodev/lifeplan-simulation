/**
 * 入力フォーム共通の小さな部品群。shadcn/ui のプリミティブをラップし、
 * 呼び出し側のAPI（label/value/onChange）は既存のまま保つことで書き換え範囲を絞っている。
 */
import { Button as ShadcnButton } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FieldWrapperProps = {
  label: string;
  children: React.ReactNode;
  hint?: string;
};

export function FieldWrapper({ label, children, hint }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <Label className="text-muted-foreground">{label}</Label>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
};

export function TextField({ label, value, onChange, placeholder, hint }: TextFieldProps) {
  return (
    <FieldWrapper label={label} hint={hint}>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </FieldWrapper>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  suffix?: string;
  hint?: string;
};

export function NumberField({ label, value, onChange, step = 1, suffix, hint }: NumberFieldProps) {
  return (
    <FieldWrapper label={label} hint={hint}>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          className="w-full"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          onChange={(e) => onChange(e.target.valueAsNumber || 0)}
        />
        {suffix && (
          <span className="whitespace-nowrap text-xs text-muted-foreground">{suffix}</span>
        )}
      </div>
    </FieldWrapper>
  );
}

type SelectFieldProps<T extends string> = {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  hint?: string;
};

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: SelectFieldProps<T>) {
  return (
    <FieldWrapper label={label} hint={hint}>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldWrapper>
  );
}

type CheckboxFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground">
      <Checkbox checked={checked} onCheckedChange={(next) => onChange(next === true)} />
      {label}
    </label>
  );
}

type ButtonVariant = "default" | "primary" | "danger" | "ghost";

const VARIANT_MAP: Record<ButtonVariant, "outline" | "default" | "destructive" | "ghost"> = {
  default: "outline",
  primary: "default",
  danger: "destructive",
  ghost: "ghost",
};

export function Button({
  children,
  onClick,
  variant = "default",
  type = "button",
  size = "default",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  type?: "button" | "submit";
  size?: "default" | "sm" | "xs";
}) {
  return (
    <ShadcnButton type={type} size={size} variant={VARIANT_MAP[variant]} onClick={onClick}>
      {children}
    </ShadcnButton>
  );
}
