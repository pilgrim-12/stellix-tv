'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSettings } from '@/contexts/SettingsContext'

const content = {
  ru: {
    title: 'Правовая информация',
    backToWatch: 'Вернуться к просмотру',
    disclaimer: 'Отказ от ответственности',
    disclaimerText: `Stellix TV является исключительно веб-плеером для воспроизведения потокового контента. Мы не храним, не размещаем и не распространяем какой-либо медиаконтент на наших серверах.

Все транслируемые каналы доступны из публичных источников в интернете. Stellix TV не несёт ответственности за содержание, доступность или легальность этих потоков в вашей юрисдикции.

Пользователи несут полную ответственность за соблюдение местного законодательства при использовании данного сервиса.`,
    noHosting: 'Мы не храним контент',
    noHostingText: 'Stellix TV работает как проигрыватель, подключающийся к публично доступным потокам. Мы не загружаем, не храним и не распространяем видеоконтент.',
    publicSources: 'Публичные источники',
    publicSourcesText: 'Все ссылки на потоки получены из открытых источников в интернете. Мы не контролируем и не модерируем содержание этих потоков.',
    userResponsibility: 'Ответственность пользователя',
    userResponsibilityText: 'Используя Stellix TV, вы соглашаетесь с тем, что несёте ответственность за соблюдение законов вашей страны относительно просмотра потокового контента.',
    dmca: 'DMCA / Удаление контента',
    dmcaText: 'Если вы являетесь правообладателем и считаете, что ваш контент неправомерно используется, пожалуйста, свяжитесь с нами. Мы оперативно удалим соответствующие ссылки.',
    contact: 'Контакты',
    contactText: 'По всем вопросам обращайтесь: support@stellix.tv',
    lastUpdated: 'Последнее обновление: декабрь 2024',
  },
  en: {
    title: 'Legal Information',
    backToWatch: 'Back to Watch',
    disclaimer: 'Disclaimer',
    disclaimerText: `Stellix TV is solely a web-based media player for streaming content. We do not store, host, or distribute any media content on our servers.

All broadcast channels are available from public sources on the internet. Stellix TV is not responsible for the content, availability, or legality of these streams in your jurisdiction.

Users are fully responsible for compliance with local laws when using this service.`,
    noHosting: 'We Do Not Host Content',
    noHostingText: 'Stellix TV operates as a player that connects to publicly available streams. We do not upload, store, or distribute video content.',
    publicSources: 'Public Sources',
    publicSourcesText: 'All stream links are obtained from publicly available sources on the internet. We do not control or moderate the content of these streams.',
    userResponsibility: 'User Responsibility',
    userResponsibilityText: 'By using Stellix TV, you agree that you are responsible for complying with the laws of your country regarding streaming content.',
    dmca: 'DMCA / Content Removal',
    dmcaText: 'If you are a copyright holder and believe your content is being used improperly, please contact us. We will promptly remove the relevant links.',
    contact: 'Contact',
    contactText: 'For all inquiries: support@stellix.tv',
    lastUpdated: 'Last updated: December 2024',
  },
  uk: {
    title: 'Правова інформація',
    backToWatch: 'Повернутися до перегляду',
    disclaimer: 'Відмова від відповідальності',
    disclaimerText: `Stellix TV є виключно веб-плеєром для відтворення потокового контенту. Ми не зберігаємо, не розміщуємо та не розповсюджуємо будь-який медіаконтент на наших серверах.

Усі транслювані канали доступні з публічних джерел в інтернеті. Stellix TV не несе відповідальності за зміст, доступність або легальність цих потоків у вашій юрисдикції.

Користувачі несуть повну відповідальність за дотримання місцевого законодавства при використанні даного сервісу.`,
    noHosting: 'Ми не зберігаємо контент',
    noHostingText: 'Stellix TV працює як програвач, що підключається до публічно доступних потоків. Ми не завантажуємо, не зберігаємо та не розповсюджуємо відеоконтент.',
    publicSources: 'Публічні джерела',
    publicSourcesText: 'Усі посилання на потоки отримані з відкритих джерел в інтернеті. Ми не контролюємо та не модеруємо зміст цих потоків.',
    userResponsibility: 'Відповідальність користувача',
    userResponsibilityText: 'Використовуючи Stellix TV, ви погоджуєтесь з тим, що несете відповідальність за дотримання законів вашої країни щодо перегляду потокового контенту.',
    dmca: 'DMCA / Видалення контенту',
    dmcaText: 'Якщо ви є правовласником і вважаєте, що ваш контент неправомірно використовується, будь ласка, зв\'яжіться з нами. Ми оперативно видалимо відповідні посилання.',
    contact: 'Контакти',
    contactText: 'З усіх питань звертайтесь: support@stellix.tv',
    lastUpdated: 'Останнє оновлення: грудень 2024',
  },
  es: {
    title: 'Información Legal',
    backToWatch: 'Volver a Ver',
    disclaimer: 'Descargo de responsabilidad',
    disclaimerText: `Stellix TV es únicamente un reproductor web para contenido en streaming. No almacenamos, alojamos ni distribuimos ningún contenido multimedia en nuestros servidores.

Todos los canales transmitidos están disponibles de fuentes públicas en internet. Stellix TV no es responsable del contenido, disponibilidad o legalidad de estas transmisiones en su jurisdicción.

Los usuarios son totalmente responsables del cumplimiento de las leyes locales al usar este servicio.`,
    noHosting: 'No Alojamos Contenido',
    noHostingText: 'Stellix TV opera como un reproductor que se conecta a transmisiones públicamente disponibles. No subimos, almacenamos ni distribuimos contenido de video.',
    publicSources: 'Fuentes Públicas',
    publicSourcesText: 'Todos los enlaces de transmisión se obtienen de fuentes públicamente disponibles en internet. No controlamos ni moderamos el contenido de estas transmisiones.',
    userResponsibility: 'Responsabilidad del Usuario',
    userResponsibilityText: 'Al usar Stellix TV, acepta que es responsable de cumplir con las leyes de su país con respecto al contenido en streaming.',
    dmca: 'DMCA / Eliminación de Contenido',
    dmcaText: 'Si es titular de derechos de autor y cree que su contenido se está utilizando indebidamente, contáctenos. Eliminaremos los enlaces relevantes de inmediato.',
    contact: 'Contacto',
    contactText: 'Para todas las consultas: support@stellix.tv',
    lastUpdated: 'Última actualización: diciembre 2024',
  },
  it: {
    title: 'Informazioni Legali',
    backToWatch: 'Torna a Guardare',
    disclaimer: 'Disclaimer',
    disclaimerText: `Stellix TV è esclusivamente un lettore web per contenuti in streaming. Non memorizziamo, ospitiamo o distribuiamo alcun contenuto multimediale sui nostri server.

Tutti i canali trasmessi sono disponibili da fonti pubbliche su internet. Stellix TV non è responsabile del contenuto, della disponibilità o della legalità di questi stream nella tua giurisdizione.

Gli utenti sono pienamente responsabili del rispetto delle leggi locali quando utilizzano questo servizio.`,
    noHosting: 'Non Ospitiamo Contenuti',
    noHostingText: 'Stellix TV opera come un lettore che si connette a stream pubblicamente disponibili. Non carichiamo, memorizziamo o distribuiamo contenuti video.',
    publicSources: 'Fonti Pubbliche',
    publicSourcesText: 'Tutti i link degli stream sono ottenuti da fonti pubblicamente disponibili su internet. Non controlliamo né moderiamo il contenuto di questi stream.',
    userResponsibility: 'Responsabilità dell\'Utente',
    userResponsibilityText: 'Utilizzando Stellix TV, accetti di essere responsabile del rispetto delle leggi del tuo paese riguardo ai contenuti in streaming.',
    dmca: 'DMCA / Rimozione Contenuti',
    dmcaText: 'Se sei un titolare di copyright e ritieni che il tuo contenuto sia utilizzato impropriamente, contattaci. Rimuoveremo prontamente i link pertinenti.',
    contact: 'Contatti',
    contactText: 'Per tutte le richieste: support@stellix.tv',
    lastUpdated: 'Ultimo aggiornamento: dicembre 2024',
  },
}

export default function LegalPage() {
  const { uiLanguage } = useSettings()
  const t = content[uiLanguage] || content.en

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <Link href="/watch">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t.backToWatch}
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-8">{t.title}</h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">{t.disclaimer}</h2>
            <p className="text-muted-foreground whitespace-pre-line">{t.disclaimerText}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t.noHosting}</h2>
            <p className="text-muted-foreground">{t.noHostingText}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t.publicSources}</h2>
            <p className="text-muted-foreground">{t.publicSourcesText}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t.userResponsibility}</h2>
            <p className="text-muted-foreground">{t.userResponsibilityText}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t.dmca}</h2>
            <p className="text-muted-foreground">{t.dmcaText}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t.contact}</h2>
            <p className="text-muted-foreground">{t.contactText}</p>
          </section>

          <p className="text-sm text-muted-foreground/60 pt-4 border-t border-border">
            {t.lastUpdated}
          </p>
        </div>
      </div>
    </div>
  )
}
