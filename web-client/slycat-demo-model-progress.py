import datetime
import numpy
import slycat.web.client
import time

def generate_model(connection, pid, marking):
  mid = connection.post_project_models(pid, "test", "Model %s" % datetime.datetime.now(), marking)
  for timestep, progress in enumerate(numpy.linspace(0, 1)):
    connection.update_model(mid, progress=progress, message="Timestep %s" % timestep)
    time.sleep(numpy.random.uniform(0.1, 0.5))

  arguments = {}
  arguments["state"] = "finished"
  arguments["result"] = numpy.random.choice(["succeeded", "failed"])
  arguments["finished"] = datetime.datetime.utcnow().isoformat()
  arguments["progress"] = 1.0
  if arguments["result"] == "succeeded":
    arguments["message"] = ""

  connection.update_model(mid, **arguments)

parser = slycat.web.client.option_parser()
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument("--model-count", type=int, default=10, help="Model count.  Default: %(default)s")
parser.add_argument("--project-name", default="Demo Model Progress Project", help="New project name.  Default: %(default)s")
arguments = parser.parse_args()

connection = slycat.web.client.connect(arguments)
pid = connection.find_or_create_project(arguments.project_name)

generate_model(connection, pid, arguments.marking)
