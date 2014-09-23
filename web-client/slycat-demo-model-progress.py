import datetime
import numpy
import slycat.web.client
import threading
import time

def generate_model(connection, pid, marking):
  mid = connection.post_project_models(pid, "test", "Model %s" % datetime.datetime.now(), marking)
  for timestep, progress in enumerate(numpy.linspace(0, 1)):
    if numpy.random.uniform(0, 1) > .995:
      connection.update_model(mid, state="finished", result="failed", finished=datetime.datetime.utcnow().isoformat(), message="RANDOM FAILURE!!!")
      return
    connection.update_model(mid, progress=progress, message="Timestep %s" % timestep)
    time.sleep(numpy.random.uniform(0.1, 0.5))

  arguments = {}
  arguments["state"] = "finished"
  arguments["result"] = numpy.random.choice(["succeeded", "succeeded", "failed"])
  arguments["finished"] = datetime.datetime.utcnow().isoformat()
  arguments["progress"] = 1.0
  if arguments["result"] == "succeeded":
    arguments["message"] = ""

  connection.update_model(mid, **arguments)

parser = slycat.web.client.option_parser()
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument("--model-count", type=int, default=4, help="Model count.  Default: %(default)s")
parser.add_argument("--project-name", default="Demo Model Progress Project", help="New project name.  Default: %(default)s")
arguments = parser.parse_args()

connection = slycat.web.client.connect(arguments)
pid = connection.find_or_create_project(arguments.project_name)

threads = [threading.Thread(target=generate_model, args=(connection, pid, arguments.marking)) for i in range(arguments.model_count)]
for thread in threads:
  thread.start()
for thread in threads:
  thread.join()
