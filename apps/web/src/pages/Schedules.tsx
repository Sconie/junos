export default function Schedules() {
  return (
    <section>
      <h1>Scheduled tasks</h1>
      <p className="muted">Crons and recurring jobs will live here.</p>
      <table className="table">
        <thead>
          <tr><th>Name</th><th>Schedule</th><th>Target</th><th>Last run</th><th>Next run</th></tr>
        </thead>
        <tbody>
          <tr><td colSpan={5} className="muted">No tasks yet.</td></tr>
        </tbody>
      </table>
    </section>
  )
}
