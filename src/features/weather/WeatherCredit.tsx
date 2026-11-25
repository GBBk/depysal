/**
 * Crédito de los datos del clima. La licencia CC BY 4.0 de MET Norway lo exige (con link a la
 * licencia) para usar el pronóstico gratis: no lo borres mientras se muestre el clima.
 */
export function WeatherCredit() {
  return (
    <p className="text-center text-xs text-muted-foreground">
      Datos del clima:{' '}
      <a
        href="https://www.met.no/en"
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        MET Norway
      </a>{' '}
      (
      <a
        href="https://creativecommons.org/licenses/by/4.0/deed.es"
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        CC BY 4.0
      </a>
      ), adaptados.
    </p>
  )
}
