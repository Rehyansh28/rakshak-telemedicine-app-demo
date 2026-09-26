"""Tidy up sensor alerts between demo rehearsals - without seed_demo and without deleting db.sqlite3.

    python manage.py resolve_sensor_alerts            # mark all open sensor alerts as resolved
    python manage.py resolve_sensor_alerts --delete   # delete ALL sensor alerts (asks first)

Only alerts made by the sensor hub are touched (source "hub" or "hub-replay").
Seeded / manually created alerts, patients, users and everything else stay as they are.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.hub_views import SENSOR_SOURCES
from core.models import EmergencyAlert


class Command(BaseCommand):
    help = "Resolve (or with --delete: remove) the sensor hub's alerts. Other alerts are never touched."

    def add_arguments(self, parser):
        parser.add_argument(
            "--delete",
            action="store_true",
            help="delete all sensor alerts instead of marking them resolved (asks for confirmation)",
        )
        parser.add_argument("--yes", action="store_true", help="do not ask for confirmation")

    def handle(self, *args, **options):
        sensor_alerts = EmergencyAlert.objects.filter(source__in=SENSOR_SOURCES)
        others = EmergencyAlert.objects.exclude(source__in=SENSOR_SOURCES).count()

        if not options["delete"]:
            count = sensor_alerts.filter(resolved_at__isnull=True).update(resolved_at=timezone.now())
            self.stdout.write(self.style.SUCCESS(f"Marked {count} open sensor alert(s) as resolved."))
            self.stdout.write(f"Other alerts left unchanged: {others}.")
            return

        total = sensor_alerts.count()
        if total == 0:
            self.stdout.write("There are no sensor alerts to delete.")
            return
        if not options["yes"]:
            answer = input(
                f"Delete {total} sensor alert(s)? {others} other alert(s) are kept. Type yes to continue: "
            )
            if answer.strip().lower() != "yes":
                self.stdout.write("Nothing deleted.")
                return
        sensor_alerts.delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {total} sensor alert(s). Other alerts kept: {others}."))
