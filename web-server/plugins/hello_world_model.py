def register_slycat_plugin(context):

  def finish(database, model):
    import datetime
    import slycat.web.server.model
    slycat.web.server.model.update(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def html(database, model):
    return "<h1 style='padding:0; margin:10px; text-align:center;'>Hello, World!</h1>"

  context.register_model("hello-world", finish, html)

