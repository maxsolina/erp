"use client"

import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface BotonVolverProps {
  onClick: () => void
  texto?: string
  className?: string
  variant?: "default" | "minimal" | "ghost"
}

export default function BotonVolver({ 
  onClick, 
  texto = "Volver",
  className,
  variant = "default"
}: BotonVolverProps) {
  const baseStyles = "flex items-center gap-2 transition-colors"
  
  const variants = {
    default: "px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50",
    minimal: "text-gray-500 hover:text-gray-700",
    ghost: "text-gray-600 hover:text-gray-800 text-sm"
  }

  return (
    <button 
      onClick={onClick}
      className={cn(baseStyles, variants[variant], className)}
    >
      <ArrowLeft className="w-4 h-4" />
      {texto && <span>{texto}</span>}
    </button>
  )
}
