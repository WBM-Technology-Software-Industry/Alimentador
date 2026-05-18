"use client"

import * as React from "react"
import { LoadingScreen } from "@/components/loading-screen"
import { useAppData } from "./data-provider"

export function DataLoadingGate({ children }: { children: React.ReactNode }) {
  const { dataLoading } = useAppData()

  if (dataLoading) return <LoadingScreen message="Carregando dados..." />

  return <>{children}</>
}
